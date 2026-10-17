/**
 * In-memory data store for chat rooms and message history with delivery & read receipts.
 */

import crypto from 'crypto';
import { encryptMessage } from './cryptoHelper.js';

// Key: roomId -> { id: string, createdAt: number, isPrivate: boolean, passwordHash: string|null, passwordSalt: string|null, messages: Array<Message> }
export const rooms = new Map();

/**
 * Hashes a private room password with a cryptographically secure random salt
 */
export function hashRoomPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { hash, salt };
}

/**
 * Verifies a private room password against stored hash & salt
 */
export function verifyRoomPassword(room, password) {
  if (!room || !room.isPrivate) return true; // Public rooms require no password
  if (!password || !room.passwordHash || !room.passwordSalt) return false;
  try {
    const computed = crypto.scryptSync(String(password).trim(), room.passwordSalt, 32).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(room.passwordHash));
  } catch (err) {
    return false;
  }
}

/**
 * Generate a clean, human-readable room code (e.g., ROOM-482)
 */
export function generateRoomId() {
  const num = Math.floor(100 + Math.random() * 900);
  return `ROOM-${num}`;
}

/**
 * Create a new chat room (Public by default, or Private with password)
 */
export function createRoom(customId, { isPrivate = false, password = '' } = {}) {
  const roomId = (customId || generateRoomId()).toUpperCase().trim();
  if (!rooms.has(roomId)) {
    let passwordHash = null;
    let passwordSalt = null;

    if (isPrivate && password) {
      const creds = hashRoomPassword(String(password).trim());
      passwordHash = creds.hash;
      passwordSalt = creds.salt;
    }

    rooms.set(roomId, {
      id: roomId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isPrivate: Boolean(isPrivate),
      passwordHash,
      passwordSalt,
      participants: new Set(),
      messages: [],
    });
  }
  return rooms.get(roomId);
}

/**
 * Get room by ID
 */
export function getRoom(roomId) {
  if (!roomId) return null;
  return rooms.get(roomId.toUpperCase().trim()) || null;
}

/**
 * Add a message to a room's history
 */
export function addMessage(roomId, { sender, text, source = 'HTTP' }) {
  let room = getRoom(roomId);
  if (!room) {
    room = createRoom(roomId);
  }

  if (sender) {
    if (!room.participants) room.participants = new Set();
    room.participants.add(sender);
  }
  room.lastActivityAt = Date.now();

  const encrypted = encryptMessage(text || '');

  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomId: room.id,
    sender: sender || 'Anonymous',
    text: text || '',
    encrypted,
    source, // 'HTTP' | 'POLLING' | 'WEBSOCKET'
    timestamp: Date.now(),
    status: 'sent', // 'sent' (Single tick) | 'delivered' (Double tick) | 'read' (Blue tick)
    deliveredTo: [], // Array<{ user: string, time: number }>
    readBy: [], // Array<{ user: string, time: number }>
  };

  room.messages.push(message);

  // Keep last 100 messages per room to prevent memory leaks in lab
  if (room.messages.length > 100) {
    room.messages.shift();
  }

  return message;
}

/**
 * Mark a message as delivered to a recipient
 */
export function markDelivered(roomId, messageId, user) {
  const room = getRoom(roomId);
  if (!room || !user) return null;

  const msg = room.messages.find((m) => m.id === messageId);
  if (!msg) return null;

  // Don't mark delivery to the sender themselves
  if (msg.sender?.toLowerCase() === user.toLowerCase()) return msg;

  const alreadyDelivered = msg.deliveredTo.some(
    (d) => d.user.toLowerCase() === user.toLowerCase()
  );

  if (!alreadyDelivered) {
    msg.deliveredTo.push({ user, time: Date.now() });
    if (msg.status === 'sent') {
      msg.status = 'delivered';
    }
  }

  return msg;
}

/**
 * Mark message(s) as read by a recipient
 */
export function markRead(roomId, messageIds, user) {
  const room = getRoom(roomId);
  if (!room || !user) return [];

  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
  const updatedMessages = [];

  for (const id of ids) {
    const msg = room.messages.find((m) => m.id === id);
    if (!msg) continue;

    // Sender cannot "read" their own message as a recipient
    if (msg.sender?.toLowerCase() === user.toLowerCase()) continue;

    const now = Date.now();

    // Ensure also marked delivered if not already
    const delivered = msg.deliveredTo.some((d) => d.user.toLowerCase() === user.toLowerCase());
    if (!delivered) {
      msg.deliveredTo.push({ user, time: now });
    }

    const alreadyRead = msg.readBy.some((r) => r.user.toLowerCase() === user.toLowerCase());
    if (!alreadyRead) {
      msg.readBy.push({ user, time: now });
      msg.status = 'read';
      updatedMessages.push(msg);
    }
  }

  return updatedMessages;
}

/**
 * Get messages, optionally filtering for only newer messages (since timestamp)
 */
export function getMessages(roomId, since = 0) {
  const room = getRoom(roomId);
  if (!room) return [];
  if (!since || Number(since) === 0) {
    return [...room.messages];
  }
  const sinceTime = Number(since);
  return room.messages.filter((msg) => msg.timestamp > sinceTime);
}
