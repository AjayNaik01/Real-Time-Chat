/**
 * In-memory sliding-window rate limiter per IP address.
 * Neutralizes brute-force attacks and Denial of Service (DoS) flooding.
 */

import { logAuditEvent, AUDIT_EVENTS } from './auditLogger.js';

// Key: `${ip}:${bucket}` -> { count: number, resetAt: number }
const buckets = new Map();

// Automatic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of buckets.entries()) {
    if (now > record.resetAt) {
      buckets.delete(key);
    }
  }
}, 300000);

/**
 * Configure rate limiter limits
 */
const LIMITS = {
  general: { max: 120, windowMs: 60000 }, // 120 req / minute
  rooms: { max: 8, windowMs: 60000 },     // 8 room creations / minute
  messages: { max: 60, windowMs: 60000 }, // 60 messages / minute
};

/**
 * Helper to check rate limit
 */
export function checkRateLimit(ip, bucketName = 'general') {
  const config = LIMITS[bucketName] || LIMITS.general;
  const now = Date.now();
  const key = `${ip}:${bucketName}`;

  let record = buckets.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + config.windowMs };
    buckets.set(key, record);
    return { allowed: true, remaining: config.max - 1, resetInSeconds: Math.ceil(config.windowMs / 1000) };
  }

  record.count++;
  const remaining = Math.max(0, config.max - record.count);
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

  if (record.count > config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
      requiresCaptcha: bucketName === 'rooms' && record.count > config.max,
    };
  }

  return { allowed: true, remaining, resetInSeconds };
}

/**
 * Express middleware generator for rate limiting
 */
export function rateLimitMiddleware(bucketName = 'general') {
  return (req, res, next) => {
    // Determine client IP (handles proxy headers)
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const result = checkRateLimit(ip, bucketName);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetInSeconds);

    if (!result.allowed) {
      logAuditEvent(AUDIT_EVENTS.RATE_LIMIT_TRIPPED, {
        ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        metadata: {
          bucket: bucketName,
          retryAfter: result.resetInSeconds,
          path: req.originalUrl || req.url,
        },
      });

      res.setHeader('Retry-After', result.resetInSeconds);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${bucketName}. Please wait ${result.resetInSeconds} seconds before trying again.`,
        retryAfter: result.resetInSeconds,
        requiresCaptcha: Boolean(result.requiresCaptcha),
      });
    }

    next();
  };
}
