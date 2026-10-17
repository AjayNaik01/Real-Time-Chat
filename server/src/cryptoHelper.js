import crypto from 'crypto';

/**
 * Derives a deterministic 256-bit AES key from the master admin secret
 */
function getMasterKey() {
  const secret = process.env.ADMIN_PASSWORD || 'admin-secret-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a message using AES-256-GCM authenticated encryption.
 * Generates unique random 12-byte IV for every message.
 *
 * @param {string} text Plaintext message
 * @returns {object} Encrypted payload with ciphertext, IV, authTag, and SHA-256 fingerprint
 */
export function encryptMessage(text = '') {
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(String(text), 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');
    const fingerprint = crypto.createHash('sha256').update(String(text)).digest('hex').substring(0, 16);

    return {
      algorithm: 'AES-256-GCM',
      iv: ivHex,
      authTag,
      ciphertext,
      fingerprint,
      wireCipher: `aes256gcm:${ivHex}:${authTag}:${ciphertext}`,
    };
  } catch (err) {
    // Graceful fallback if crypto fails
    return {
      algorithm: 'PLAINTEXT_FALLBACK',
      iv: '000000000000000000000000',
      authTag: '00000000000000000000000000000000',
      ciphertext: Buffer.from(String(text)).toString('hex'),
      fingerprint: 'none',
      wireCipher: `raw:${Buffer.from(String(text)).toString('hex')}`,
    };
  }
}

/**
 * Decrypts an encrypted payload using the master admin secret key
 *
 * @param {object|string} payload Encrypted payload object or wireCipher string
 * @returns {string} Decrypted plaintext message
 */
export function decryptMessage(payload) {
  try {
    const key = getMasterKey();
    let ivHex, authTagHex, ciphertextHex;

    if (typeof payload === 'string' && payload.startsWith('aes256gcm:')) {
      const parts = payload.split(':');
      ivHex = parts[1];
      authTagHex = parts[2];
      ciphertextHex = parts[3];
    } else if (payload && typeof payload === 'object') {
      ivHex = payload.iv;
      authTagHex = payload.authTag;
      ciphertextHex = payload.ciphertext;
    } else {
      return '';
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    return '[Decryption Error: Key mismatch or corrupted ciphertext]';
  }
}
