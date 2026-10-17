import { WebSocketServer, WebSocket } from 'ws';
import { addMessage, getRoom, markDelivered, markRead, verifyRoomPassword } from './store.js';
import { sanitizeMessageText, sanitizeNickname } from './security.js';
import { logAuditEvent, AUDIT_EVENTS } from './auditLogger.js';

// Map: roomId -> Set of WebSocket instances
const roomClients = new Map();

// Metadata per socket: { roomId, user, ip, userAgent, isAlive, frameCount, frameResetAt }
const socketMeta = new Map();

/**
 * Broadcasts a JSON message to all connected clients in a specific room.
 * @param {string} roomId
 * @param {object} payload
 * @param {WebSocket} [excludeWs] - Optional socket to skip (e.g., sender for typing events)
 */
export function broadcastToRoom(roomId, payload, excludeWs = null) {
  if (!roomId) return;
  const clients = roomClients.get(roomId);
  if (!clients) return;

  const serialized = JSON.stringify(payload);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}

/**
 * Get active usernames in a room
 */
export function getRoomMembers(roomId) {
  const clients = roomClients.get(roomId);
  if (!clients) return [];
  const members = [];
  for (const client of clients) {
    const meta = socketMeta.get(client);
    if (meta && meta.user) {
      members.push(meta.user);
    }
  }
  return [...new Set(members)];
}

/**
 * Get total connected socket clients across all rooms
 */
export function getTotalConnectedSockets() {
  return socketMeta.size;
}

/**
 * Initializes the WebSocket server and binds connection listeners
 * @param {import('http').Server} httpServer
 */
export function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  console.log('📡 [WebSocket] WebSocketServer attached to HTTP server');

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Initialize socket metadata with rate limiter & IP traceability
    socketMeta.set(ws, {
      roomId: null,
      user: null,
      ip,
      userAgent,
      isAlive: true,
      frameCount: 0,
      frameResetAt: Date.now() + 2000,
    });

    logAuditEvent(AUDIT_EVENTS.SOCKET_CONNECTED, {
      ip,
      userAgent,
      metadata: { protocol: 'WEBSOCKET' },
    });

    // Heartbeat listener
    ws.on('pong', () => {
      const meta = socketMeta.get(ws);
      if (meta) meta.isAlive = true;
    });

    // Handle incoming client frames
    ws.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        handleClientMessage(ws, payload);
      } catch (err) {
        console.error('⚠️ [WebSocket] Failed to parse message frame:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      handleClientDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('❌ [WebSocket] Socket error:', err.message);
    });
  });

  // Heartbeat interval: detect and terminate broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const meta = socketMeta.get(ws);
      if (!meta) return;

      if (!meta.isAlive) {
        console.log(`🔌 [WebSocket] Terminating inactive socket for user: ${meta.user || 'Unknown'}`);
        return ws.terminate();
      }

      meta.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

/**
 * Process incoming messages from a client socket with rate limiting & sanitization
 */
function handleClientMessage(ws, payload) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  // 1. WebSocket Frame Rate Limiting (max 25 frames per 2s)
  const now = Date.now();
  if (now > meta.frameResetAt) {
    meta.frameCount = 1;
    meta.frameResetAt = now + 2000;
  } else {
    meta.frameCount++;
    if (meta.frameCount > 25) {
      // Throttle frame spam
      return ws.send(
        JSON.stringify({
          type: 'warning',
          message: 'WebSocket rate limit exceeded: slowing down frames.',
        })
      );
    }
  }

  const { type, roomId, user, text, isTyping, messageId, messageIds } = payload;

  switch (type) {
    case 'join': {
      if (!roomId) return;
      const cleanUser = sanitizeNickname(user);
      const cleanRoom = roomId.toUpperCase().trim();

      // Guard private rooms: verify password
      const targetRoom = getRoom(cleanRoom);
      if (targetRoom && targetRoom.isPrivate) {
        const { password } = payload;
        if (!verifyRoomPassword(targetRoom, password)) {
          ws.send(
            JSON.stringify({
              type: 'error',
              code: 'ERR_INVALID_ROOM_PASSWORD',
              message: 'Incorrect password for private room',
            })
          );
          logAuditEvent(AUDIT_EVENTS.SECURITY_WARNING, {
            ip: meta.ip,
            user: cleanUser,
            userAgent: meta.userAgent,
            roomId: cleanRoom,
            metadata: { reason: 'Failed WebSocket private room password attempt' },
          });
          return;
        }
      }

      // Leave previous room if any
      if (meta.roomId && roomClients.has(meta.roomId)) {
        roomClients.get(meta.roomId).delete(ws);
      }

      meta.roomId = cleanRoom;
      meta.user = cleanUser;

      if (!roomClients.has(meta.roomId)) {
        roomClients.set(meta.roomId, new Set());
      }
      roomClients.get(meta.roomId).add(ws);

      if (targetRoom) {
        if (!targetRoom.participants) targetRoom.participants = new Set();
        if (cleanUser) targetRoom.participants.add(cleanUser);
        targetRoom.lastActivityAt = Date.now();
      }

      console.log(`👤 [WebSocket] "${meta.user}" joined room: ${meta.roomId} (${targetRoom?.isPrivate ? 'PRIVATE' : 'PUBLIC'})`);

      // Acknowledge join
      ws.send(
        JSON.stringify({
          type: 'joined',
          roomId: meta.roomId,
          isPrivate: Boolean(targetRoom?.isPrivate),
          members: getRoomMembers(meta.roomId),
        })
      );

      // Notify room presence
      broadcastToRoom(meta.roomId, {
        type: 'presence',
        members: getRoomMembers(meta.roomId),
        systemMessage: `${meta.user} joined the room.`,
      });
      logAuditEvent(AUDIT_EVENTS.ROOM_JOINED, {
        ip: meta.ip,
        user: meta.user,
        userAgent: meta.userAgent,
        roomId: meta.roomId,
      });
      break;
    }

    case 'typing': {
      if (!meta.roomId) return;
      broadcastToRoom(
        meta.roomId,
        {
          type: 'typing',
          user: meta.user || sanitizeNickname(user),
          isTyping: Boolean(isTyping),
        },
        ws
      );
      break;
    }

    case 'chat_message': {
      if (!meta.roomId || !text) return;
      const sanitizedText = sanitizeMessageText(text);
      if (!sanitizedText) return;

      const savedMsg = addMessage(meta.roomId, {
        sender: meta.user || sanitizeNickname(user),
        text: sanitizedText,
        source: 'WEBSOCKET',
      });

      logAuditEvent(AUDIT_EVENTS.MESSAGE_SENT, {
        ip: meta.ip,
        user: meta.user || user,
        userAgent: meta.userAgent,
        roomId: meta.roomId,
        messageId: savedMsg.id,
        metadata: {
          length: sanitizedText.length,
          source: 'WEBSOCKET',
          cipherSnippet: savedMsg.encrypted?.wireCipher?.substring(0, 36) + '...',
          fingerprint: savedMsg.encrypted?.fingerprint,
        },
      });

      broadcastToRoom(meta.roomId, {
        type: 'chat_message',
        data: savedMsg,
      });

      broadcastToRoom(
        meta.roomId,
        {
          type: 'typing',
          user: meta.user,
          isTyping: false,
        },
        ws
      );
      break;
    }

    case 'msg_delivered': {
      if (!meta.roomId || !messageId) return;
      const updated = markDelivered(meta.roomId, messageId, meta.user || user);
      if (updated) {
        logAuditEvent(AUDIT_EVENTS.MESSAGE_DELIVERED, {
          ip: meta.ip,
          user: meta.user || user,
          userAgent: meta.userAgent,
          roomId: meta.roomId,
          messageId,
        });

        broadcastToRoom(meta.roomId, {
          type: 'msg_status_update',
          data: updated,
        });
      }
      break;
    }

    case 'msg_read': {
      if (!meta.roomId) return;
      const ids = messageIds || (messageId ? [messageId] : []);
      if (ids.length === 0) return;

      const updatedList = markRead(meta.roomId, ids, meta.user || user);
      for (const updated of updatedList) {
        logAuditEvent(AUDIT_EVENTS.MESSAGE_READ, {
          ip: meta.ip,
          user: meta.user || user,
          userAgent: meta.userAgent,
          roomId: meta.roomId,
          messageId: updated.id,
        });

        broadcastToRoom(meta.roomId, {
          type: 'msg_status_update',
          data: updated,
        });
      }
      break;
    }

    default:
      console.warn('⚠️ [WebSocket] Unknown message type:', type);
  }
}

/**
 * Handle socket disconnection and cleanup
 */
function handleClientDisconnect(ws) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  const { roomId, user, ip, userAgent } = meta;

  logAuditEvent(AUDIT_EVENTS.SOCKET_DISCONNECTED, {
    ip,
    user,
    userAgent,
    roomId,
  });

  if (roomId && roomClients.has(roomId)) {
    const clients = roomClients.get(roomId);
    clients.delete(ws);

    if (clients.size === 0) {
      roomClients.delete(roomId);
    } else {
      broadcastToRoom(roomId, {
        type: 'typing',
        user,
        isTyping: false,
      });

      broadcastToRoom(roomId, {
        type: 'presence',
        members: getRoomMembers(roomId),
        systemMessage: `${user || 'A user'} left the room.`,
      });
    }
  }

  socketMeta.delete(ws);
  console.log(`👋 [WebSocket] User disconnected: ${user || 'Unknown'}`);
}
