import crypto from 'crypto';

// In-memory store: captchaId -> { answer: string, expiresAt: number }
const captchaStore = new Map();

// Periodic cleanup every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (now > record.expiresAt) {
      captchaStore.delete(id);
    }
  }
}, 120000);

/**
 * Generate a new human verification challenge (CAPTCHA)
 */
export function generateCaptcha() {
  const num1 = Math.floor(2 + Math.random() * 8);
  const num2 = Math.floor(1 + Math.random() * 9);
  const isAddition = Math.random() > 0.3;

  const question = isAddition
    ? `What is ${num1} + ${num2}?`
    : `What is ${Math.max(num1, num2) + 5} - ${Math.min(num1, num2)}?`;

  const answer = isAddition
    ? String(num1 + num2)
    : String(Math.max(num1, num2) + 5 - Math.min(num1, num2));

  const captchaId = `cap-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = Date.now() + 300000; // 5 minutes validity

  captchaStore.set(captchaId, { answer, expiresAt });

  return {
    captchaId,
    question,
    expiresInSeconds: 300,
  };
}

/**
 * Verify a submitted CAPTCHA response (One-time use)
 */
export function verifyCaptcha(captchaId, userAnswer) {
  if (!captchaId || userAnswer === undefined || userAnswer === null) {
    return false;
  }

  const record = captchaStore.get(captchaId);
  if (!record) return false;

  // Single-use guarantee: delete immediately to prevent replay attacks
  captchaStore.delete(captchaId);

  if (Date.now() > record.expiresAt) {
    return false;
  }

  return String(userAnswer).trim() === record.answer;
}
