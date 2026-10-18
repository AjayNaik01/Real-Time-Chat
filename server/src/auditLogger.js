import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

// Environment Configuration
const AUDIT_FILE_PATH = process.env.AUDIT_LOG_FILE || path.join(process.cwd(), 'logs', 'audit.jsonl');
const DATABASE_URL = process.env.DATABASE_URL || null;
const AUDIT_WEBHOOK_URL = process.env.AUDIT_WEBHOOK_URL || null;

// Ensure logs directory exists for local disk persistence
try {
  const dir = path.dirname(AUDIT_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ [AuditLog] Could not create local logs directory:', e.message);
}

// PostgreSQL Connection Pool (Optional - active only if DATABASE_URL is provided)
let pgPool = null;

if (DATABASE_URL) {
  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });

    // Initialize audit table schema if not existing
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        ip_address VARCHAR(64),
        username VARCHAR(64),
        user_agent TEXT,
        room_id VARCHAR(64),
        message_id VARCHAR(64),
        payload JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_room_id ON audit_logs(room_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);
    `).then(() => {
      console.log('🛡️ [AuditLog] PostgreSQL persistence initialized (audit_logs table verified)');
    }).catch((err) => {
      console.warn('⚠️ [AuditLog] PostgreSQL schema initialization failed:', err.message);
    });
  } catch (err) {
    console.warn('⚠️ [AuditLog] Failed to initialize PostgreSQL pool:', err.message);
  }
}

/**
 * Standardized audit event types for compliance, forensics, and monitoring
 */
export const AUDIT_EVENTS = {
  ROOM_CREATED: 'ROOM_CREATED',
  ROOM_JOINED: 'ROOM_JOINED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_DELIVERED: 'MESSAGE_DELIVERED',
  MESSAGE_READ: 'MESSAGE_READ',
  RATE_LIMIT_TRIPPED: 'RATE_LIMIT_TRIPPED',
  CAPTCHA_CHALLENGE: 'CAPTCHA_CHALLENGE',
  CAPTCHA_VERIFIED: 'CAPTCHA_VERIFIED',
  SOCKET_CONNECTED: 'SOCKET_CONNECTED',
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SECURITY_WARNING: 'SECURITY_WARNING',
  FILE_UPLOADED: 'FILE_UPLOADED',
};

/**
 * Record an immutable audit log entry across configured sinks:
 * 1. Formatted STDOUT (captured automatically by CloudWatch, Render, Papertrail, Datadog)
 * 2. Local Append-Only JSONL file (logs/audit.jsonl)
 * 3. PostgreSQL Database (if DATABASE_URL configured)
 * 4. Remote Webhook / SIEM HTTP Ingestion (if AUDIT_WEBHOOK_URL configured)
 *
 * @param {string} eventType - One of AUDIT_EVENTS
 * @param {object} params
 * @param {string} [params.ip] - Client IP address
 * @param {string} [params.user] - User nickname / handle
 * @param {string} [params.userAgent] - Client HTTP user agent
 * @param {string} [params.roomId] - Chat room code (e.g. ROOM-482)
 * @param {string} [params.messageId] - Chat message ID (if applicable)
 * @param {object} [params.metadata] - Additional forensic details (payload size, source, latency)
 */
export async function logAuditEvent(eventType, {
  ip = '127.0.0.1',
  user = 'Anonymous',
  userAgent = 'N/A',
  roomId = null,
  messageId = null,
  metadata = {},
} = {}) {
  const timestamp = new Date().toISOString();
  const eventId = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const auditRecord = {
    id: eventId,
    timestamp,
    eventType,
    actor: {
      ip: String(ip).trim(),
      user: String(user).trim(),
      userAgent: String(userAgent).substring(0, 500),
    },
    target: {
      roomId: roomId ? String(roomId).toUpperCase().trim() : null,
      messageId: messageId ? String(messageId).trim() : null,
    },
    metadata: {
      ...metadata,
    },
  };

  const serialized = JSON.stringify(auditRecord);

  // 1. STDOUT Sink (Render / Papertrail / Datadog / Docker log collector)
  console.log(`🛡️ [AUDIT_LOG] ${serialized}`);

  // 2. Local File Sink (Append-only JSONL)
  try {
    fs.appendFile(AUDIT_FILE_PATH, serialized + '\n', 'utf8', (err) => {
      if (err) {
        console.error('⚠️ [AuditLog] Error writing to audit log file:', err.message);
      }
    });
  } catch (err) {
    // Non-blocking catch
  }

  // 3. PostgreSQL Database Sink (Async non-blocking)
  if (pgPool) {
    pgPool.query(
      `INSERT INTO audit_logs (id, timestamp, event_type, ip_address, username, user_agent, room_id, message_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        auditRecord.id,
        auditRecord.timestamp,
        auditRecord.eventType,
        auditRecord.actor.ip,
        auditRecord.actor.user,
        auditRecord.actor.userAgent,
        auditRecord.target.roomId,
        auditRecord.target.messageId,
        auditRecord.metadata,
      ]
    ).catch((err) => {
      console.warn('⚠️ [AuditLog] PostgreSQL insert failed:', err.message);
    });
  }

  // 4. Remote Webhook / SIEM HTTP Forwarder (Async non-blocking)
  if (AUDIT_WEBHOOK_URL && typeof fetch === 'function') {
    fetch(AUDIT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Event': eventType,
      },
      body: serialized,
      // 3-second timeout so it never hangs
      signal: AbortSignal.timeout(3000),
    }).catch(() => {
      // Non-blocking catch
    });
  }

  return auditRecord;
}
