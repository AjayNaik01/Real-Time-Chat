// Load .env file automatically if available
try {
  process.loadEnvFile?.();
} catch (e) {}

import http from 'http';
import express from 'express';
import cors from 'cors';
import { createRoom, getRoom, addMessage, getMessages, generateRoomId, markDelivered, markRead, verifyRoomPassword } from './store.js';
import { setupWebSocket, broadcastToRoom, getTotalConnectedSockets } from './wsHandler.js';
import { securityHeaders, sanitizeMessageText, sanitizeNickname, validateRoomId } from './security.js';
import { rateLimitMiddleware } from './rateLimiter.js';
import { generateCaptcha, verifyCaptcha } from './captcha.js';
import { logAuditEvent, AUDIT_EVENTS } from './auditLogger.js';
import {
  adminAuthMiddleware,
  handleAdminLogin,
  handleAdminOverview,
  handleAdminGetRooms,
  handleAdminGetAuditLogs,
  handleAdminDecryptMessage,
} from './admin.js';

const PORT = process.env.PORT || 3001;
const app = express();

// 1. Security & Parsing Middlewares
app.use(securityHeaders);
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token', 'x-room-password'],
    exposedHeaders: ['Retry-After'],
  })
);
app.use(express.json({ limit: '100kb' })); // Guard against large payloads

// 2. Global Rate Limiting for general traffic (120 req/min)
app.use('/api', rateLimitMiddleware('general'));

// 3. Request logger for inspection
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api') && req.method !== 'OPTIONS') {
      const duration = Date.now() - start;
      console.log(`🌐 [HTTP ${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// -------------------------------------------------------------
// Health & System Diagnostic Endpoints
// -------------------------------------------------------------

/**
 * Basic health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Extended system diagnostics (uptime, memory, active connections)
 */
app.get('/api/system/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    uptimeSeconds: Math.floor(process.uptime()),
    activeSockets: getTotalConnectedSockets(),
    memoryFootprint: {
      rssMB: (mem.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    },
    security: {
      rateLimiting: 'Active (Sliding Window)',
      owaspHeaders: 'Enabled (Nosniff, X-Frame-Options DENY)',
      xssSanitization: 'Enabled (Entity Escaping)',
      captchaProtection: 'Enabled (Dynamic Challenge)',
      auditLogging: {
        active: true,
        sinks: [
          'stdout (Render / Papertrail / Datadog Log Drain)',
          'local-file (logs/audit.jsonl)',
          process.env.DATABASE_URL ? 'postgresql (Active)' : 'postgresql (Set DATABASE_URL to enable)',
          process.env.AUDIT_WEBHOOK_URL ? 'webhook (Active)' : 'webhook (Set AUDIT_WEBHOOK_URL to enable)',
        ],
      },
    },
  });
});

// -------------------------------------------------------------
// CAPTCHA Bot Protection Endpoints
// -------------------------------------------------------------

/**
 * Generate a dynamic CAPTCHA challenge
 * GET /api/captcha
 */
app.get('/api/captcha', (req, res) => {
  const challenge = generateCaptcha();
  res.json({ success: true, ...challenge });
});

/**
 * Verify a CAPTCHA response
 * POST /api/captcha/verify
 * Body: { captchaId: string, answer: string }
 */
app.post('/api/captcha/verify', (req, res) => {
  const { captchaId, answer } = req.body;
  const isValid = verifyCaptcha(captchaId, answer);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired CAPTCHA challenge',
    });
  }
  res.json({ success: true, message: 'Verification successful' });
});

// -------------------------------------------------------------
// Hidden Admin & Security Command Center (SOC) Endpoints
// -------------------------------------------------------------
app.post('/api/admin/login', handleAdminLogin);
app.get('/api/admin/overview', adminAuthMiddleware, handleAdminOverview);
app.get('/api/admin/rooms', adminAuthMiddleware, handleAdminGetRooms);
app.get('/api/admin/audit-logs', adminAuthMiddleware, handleAdminGetAuditLogs);
app.post('/api/admin/decrypt', adminAuthMiddleware, handleAdminDecryptMessage);

// -------------------------------------------------------------
// REST Endpoints (Rooms & Messages)
// -------------------------------------------------------------

/**
 * Create a new room with rate limiting (max 8/min) & optional CAPTCHA check
 * POST /api/rooms
 * Body: { roomId?: string, captchaId?: string, captchaAnswer?: string }
 */
app.post('/api/rooms', rateLimitMiddleware('rooms'), (req, res) => {
  const { roomId, isPrivate, password, captchaId, captchaAnswer } = req.body || {};

  // If CAPTCHA was submitted, verify it
  if (captchaId) {
    const verified = verifyCaptcha(captchaId, captchaAnswer);
    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'CAPTCHA verification failed. Please try again.',
      });
    }
  }

  // Validate custom room ID format if supplied
  let cleanId = null;
  if (roomId) {
    cleanId = validateRoomId(roomId);
    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Room ID. Must be at least 3 alphanumeric characters.',
      });
    }
  }

  // If private room, enforce strong password requirement
  if (isPrivate) {
    const cleanPassword = typeof password === 'string' ? password.trim() : '';
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Private rooms require a strong password (minimum 6 characters).',
        code: 'ERR_WEAK_ROOM_PASSWORD',
      });
    }
  }

  const room = createRoom(cleanId, {
    isPrivate: Boolean(isPrivate),
    password: isPrivate ? String(password).trim() : '',
  });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  logAuditEvent(AUDIT_EVENTS.ROOM_CREATED, {
    ip,
    userAgent,
    roomId: room.id,
    metadata: {
      isCustomId: Boolean(cleanId),
      isPrivate: room.isPrivate,
    },
  });

  res.status(201).json({
    success: true,
    room: {
      id: room.id,
      createdAt: room.createdAt,
      isPrivate: room.isPrivate,
    },
  });
});

/**
 * Check if a room exists
 * GET /api/rooms/:roomId
 */
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const cleanId = validateRoomId(roomId);
  if (!cleanId) {
    return res.status(400).json({ success: false, error: 'Invalid room format' });
  }

  const room = getRoom(cleanId);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room Not Found',
      code: 'ERR_ROOM_NOT_FOUND',
      roomId: cleanId,
    });
  }

  res.json({
    success: true,
    room: {
      id: room.id,
      createdAt: room.createdAt,
      isPrivate: room.isPrivate,
      messageCount: room.messages.length,
    },
  });
});

/**
 * Verify password for a private room
 * POST /api/rooms/:roomId/verify-password
 * Body: { password: string }
 */
app.post('/api/rooms/:roomId/verify-password', (req, res) => {
  const { roomId } = req.params;
  const { password } = req.body || {};
  const room = getRoom(roomId);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Room Not Found', code: 'ERR_ROOM_NOT_FOUND' });
  }

  if (!room.isPrivate) {
    return res.json({ success: true, verified: true, isPrivate: false });
  }

  const isValid = verifyRoomPassword(room, password);
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  if (!isValid) {
    logAuditEvent(AUDIT_EVENTS.SECURITY_WARNING, {
      ip,
      roomId: room.id,
      user: req.body?.user || 'Anonymous',
      metadata: { reason: 'Incorrect private room password attempt' },
    });

    return res.status(401).json({
      success: false,
      error: 'Incorrect room password',
      code: 'ERR_INVALID_ROOM_PASSWORD',
    });
  }

  res.json({ success: true, verified: true, isPrivate: true });
});

/**
 * Fetch messages for a room
 * GET /api/rooms/:roomId/messages?since=123456789
 */
app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const since = req.query.since ? Number(req.query.since) : 0;

  const room = getRoom(roomId);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room Not Found',
      code: 'ERR_ROOM_NOT_FOUND',
    });
  }

  // Guard private room access
  if (room.isPrivate) {
    const password = req.headers['x-room-password'] || req.query.password;
    if (!verifyRoomPassword(room, password)) {
      return res.status(401).json({
        success: false,
        error: 'Password required to access this private room',
        code: 'ERR_ROOM_PASSWORD_REQUIRED',
      });
    }
  }

  const messages = getMessages(roomId, since);

  res.json({
    success: true,
    roomId: room.id,
    count: messages.length,
    messages,
    serverTime: Date.now(),
  });
});

/**
 * Post a message via HTTP with rate limiting (60/min) & XSS sanitization
 * POST /api/rooms/:roomId/messages
 * Body: { sender: string, text: string, source: 'HTTP' | 'POLLING', password?: string }
 */
app.post('/api/rooms/:roomId/messages', rateLimitMiddleware('messages'), (req, res) => {
  const { roomId } = req.params;
  const { sender, text, source = 'HTTP', password } = req.body;

  const room = getRoom(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room Not Found', code: 'ERR_ROOM_NOT_FOUND' });
  }

  // Guard private room post
  if (room.isPrivate) {
    const pwd = req.headers['x-room-password'] || password;
    if (!verifyRoomPassword(room, pwd)) {
      return res.status(401).json({
        success: false,
        error: 'Password required to post in this private room',
        code: 'ERR_ROOM_PASSWORD_REQUIRED',
      });
    }
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Message text is required' });
  }

  const sanitizedText = sanitizeMessageText(text);
  const cleanSender = sanitizeNickname(sender);

  const message = addMessage(roomId, {
    sender: cleanSender,
    text: sanitizedText,
    source,
  });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  logAuditEvent(AUDIT_EVENTS.MESSAGE_SENT, {
    ip,
    user: cleanSender,
    userAgent,
    roomId,
    messageId: message.id,
    metadata: {
      length: sanitizedText.length,
      source,
      cipherSnippet: message.encrypted?.wireCipher?.substring(0, 36) + '...',
      fingerprint: message.encrypted?.fingerprint,
    },
  });

  // Broadcast over WebSocket to active peers
  broadcastToRoom(roomId.toUpperCase().trim(), {
    type: 'chat_message',
    data: message,
  });

  res.status(201).json({
    success: true,
    message,
  });
});

/**
 * Mark message delivered via HTTP
 * POST /api/rooms/:roomId/messages/:messageId/delivered
 */
app.post('/api/rooms/:roomId/messages/:messageId/delivered', (req, res) => {
  const { roomId, messageId } = req.params;
  const { user } = req.body;
  const updated = markDelivered(roomId, messageId, sanitizeNickname(user));
  if (updated) {
    broadcastToRoom(roomId.toUpperCase().trim(), {
      type: 'msg_status_update',
      data: updated,
    });
  }
  res.json({ success: true, message: updated });
});

/**
 * Mark messages read via HTTP
 * POST /api/rooms/:roomId/messages/read
 */
app.post('/api/rooms/:roomId/messages/read', (req, res) => {
  const { roomId } = req.params;
  const { messageIds, user } = req.body;
  const updatedList = markRead(roomId, messageIds, sanitizeNickname(user));
  for (const updated of updatedList) {
    broadcastToRoom(roomId.toUpperCase().trim(), {
      type: 'msg_status_update',
      data: updated,
    });
  }
  res.json({ success: true, count: updatedList.length, messages: updatedList });
});

// -------------------------------------------------------------
// 404 & 500 Error Handlers
// -------------------------------------------------------------

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint Not Found',
    code: 'ERR_ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
  });
});

// Global 500 Internal Server Error handler
app.use((err, req, res, next) => {
  console.error('🔥 [Server Error 500]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    code: 500,
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// -------------------------------------------------------------
// Attach WebSockets & Start Server
// -------------------------------------------------------------

const httpServer = http.createServer(app);
setupWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Production-Hardened Chat Lab Server running at:`);
  console.log(`   - HTTP REST API : http://localhost:${PORT}/api`);
  console.log(`   - WebSocket URI : ws://localhost:${PORT}`);
  console.log(`   - Security      : OWASP Headers + Rate Limiting Active`);
  console.log(`======================================================\n`);
});
