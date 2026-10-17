import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { rooms } from './store.js';
import { getTotalConnectedSockets, getRoomMembers } from './wsHandler.js';
import { logAuditEvent, AUDIT_EVENTS } from './auditLogger.js';
import { decryptMessage } from './cryptoHelper.js';

// Secret key for admin authentication (defaults to secure development secret)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Active in-memory admin sessions: token -> expiresAt
const adminSessions = new Map();

// Helper to cleanup expired sessions every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions.entries()) {
    if (now > expiresAt) {
      adminSessions.delete(token);
    }
  }
}, 900000);

/**
 * Authentication middleware for all /api/admin/* routes
 */
export function adminAuthMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin authentication token required',
      code: 'ERR_ADMIN_UNAUTHORIZED',
    });
  }

  const expiresAt = adminSessions.get(token);
  if (Date.now() > expiresAt) {
    adminSessions.delete(token);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin session expired. Please log in again.',
      code: 'ERR_ADMIN_SESSION_EXPIRED',
    });
  }

  next();
}

/**
 * Admin Login Handler
 * POST /api/admin/login
 * Body: { password: string }
 */
export function handleAdminLogin(req, res) {
  const { password } = req.body || {};
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin-secret-2026';

  if (!password || password !== expectedPassword) {
    logAuditEvent(AUDIT_EVENTS.SECURITY_WARNING, {
      ip,
      userAgent,
      user: 'AdminLoginAttempt',
      metadata: { reason: 'Invalid admin credentials entered' },
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid admin access key',
    });
  }

  // Generate secure 48-byte hex session token (valid for 8 hours)
  const token = `adm_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  adminSessions.set(token, expiresAt);

  logAuditEvent(AUDIT_EVENTS.SECURITY_WARNING, {
    ip,
    userAgent,
    user: 'Admin',
    metadata: { action: 'Admin logged into Command Center' },
  });

  res.json({
    success: true,
    token,
    expiresAt,
    message: 'Admin Command Center access granted',
  });
}

/**
 * Admin Overview & High-Level Telemetry
 * GET /api/admin/overview
 */
export function handleAdminOverview(req, res) {
  const mem = process.memoryUsage();
  const allRooms = Array.from(rooms.values());

  const totalMessages = allRooms.reduce((acc, r) => acc + (r.messages?.length || 0), 0);
  const activeRoomsCount = allRooms.length;

  res.json({
    success: true,
    telemetry: {
      uptimeSeconds: Math.floor(process.uptime()),
      activeSockets: getTotalConnectedSockets(),
      activeRooms: activeRoomsCount,
      totalBufferedMessages: totalMessages,
      memory: {
        rssMB: (mem.rss / 1024 / 1024).toFixed(2),
        heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
        heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
      },
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
}

/**
 * Admin Room & Conversation Inspector
 * GET /api/admin/rooms
 */
export function handleAdminGetRooms(req, res) {
  const roomData = Array.from(rooms.values()).map((r) => {
    const liveMembers = getRoomMembers(r.id);
    const knownSenders = Array.from(new Set(r.messages.map((m) => m.sender).filter(Boolean)));
    const storedParticipants = r.participants ? Array.from(r.participants) : [];
    const allParticipantsList = Array.from(new Set([...storedParticipants, ...knownSenders, ...liveMembers]));

    const participantDetails = allParticipantsList.map((handle) => ({
      handle,
      isOnline: liveMembers.includes(handle),
    }));

    return {
      id: r.id,
      createdAt: r.createdAt,
      lastActivityAt: r.lastActivityAt || (r.messages.length > 0 ? r.messages[r.messages.length - 1].timestamp : r.createdAt),
      isPrivate: Boolean(r.isPrivate),
      messageCount: r.messages.length,
      activeMembers: liveMembers,
      participants: participantDetails,
      liveSocketCount: liveMembers.length,
      recentMessages: r.messages.slice(-50), // Last 50 messages for full forensic inspection
    };
  });

  res.json({
    success: true,
    count: roomData.length,
    rooms: roomData,
  });
}

/**
 * Admin Forensic Audit Log Reader
 * GET /api/admin/audit-logs?limit=100&search=...
 */
export function handleAdminGetAuditLogs(req, res) {
  const limit = Math.min(200, Number(req.query.limit) || 100);
  const search = req.query.search?.toLowerCase().trim() || '';

  const auditLogFile = process.env.AUDIT_LOG_FILE || path.join(process.cwd(), 'logs', 'audit.jsonl');

  if (!fs.existsSync(auditLogFile)) {
    return res.json({
      success: true,
      count: 0,
      logs: [],
    });
  }

  try {
    const raw = fs.readFileSync(auditLogFile, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);

    let parsed = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Apply search filter if query is provided
    if (search) {
      parsed = parsed.filter((entry) => {
        const str = JSON.stringify(entry).toLowerCase();
        return str.includes(search);
      });
    }

    // Return the newest entries first
    const newestLogs = parsed.reverse().slice(0, limit);

    res.json({
      success: true,
      count: newestLogs.length,
      logs: newestLogs,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to read forensic audit log file',
      details: err.message,
    });
  }
}

/**
 * Admin Message Decryption Utility
 * POST /api/admin/decrypt
 * Body: { payload: object | string }
 */
export function handleAdminDecryptMessage(req, res) {
  const { payload } = req.body || {};
  if (!payload) {
    return res.status(400).json({ success: false, error: 'Encrypted payload is required' });
  }

  const decryptedText = decryptMessage(payload);
  res.json({
    success: true,
    decryptedText,
  });
}

