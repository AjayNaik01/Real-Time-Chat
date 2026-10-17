/**
 * Security headers and input sanitization helpers adhering to OWASP guidelines.
 */

/**
 * Express middleware to set hardened OWASP HTTP headers
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by forbidding embedding in iframes
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable legacy browser XSS filters
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information sent in requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser caching for sensitive API routes
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * Escape HTML special characters to prevent Reflected/Stored XSS
 */
export function escapeHtml(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize and validate message payload
 */
export function sanitizeMessageText(text = '') {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  // Limit message length to 2000 characters
  const bounded = trimmed.slice(0, 2000);
  return escapeHtml(bounded);
}

/**
 * Sanitize and validate user nicknames
 */
export function sanitizeNickname(name = '') {
  if (typeof name !== 'string') return 'Anonymous';
  const trimmed = name.trim();
  // Strip control chars, limit to 30 chars
  const clean = trimmed.replace(/[^\w\s-]/gi, '').slice(0, 30);
  return clean || 'Anonymous';
}

/**
 * Validate room code format (alphanumeric and dashes, max 20 chars)
 */
export function validateRoomId(roomId = '') {
  if (typeof roomId !== 'string') return null;
  const clean = roomId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
  return clean.length >= 3 ? clean : null;
}
