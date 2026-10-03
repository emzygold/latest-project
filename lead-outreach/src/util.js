// Logging that never prints lead data or secrets, plus delay and retry helpers.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s()-]{6,}\d/g;
const SECRET_RE = /(Bearer\s+|api[_-]?key["'=:\s]+|token["'=:\s]+|pass(word)?["'=:\s]+)[^\s"',]+/gi;

/** Mask emails, phone numbers and credentials in any text before it reaches the console. */
export function redact(text) {
  return String(text ?? "")
    .replace(SECRET_RE, "$1[redacted]")
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, "[phone]");
}

export const log = {
  info: (...a) => console.log(new Date().toISOString(), "INFO ", ...a.map(redact)),
  warn: (...a) => console.warn(new Date().toISOString(), "WARN ", ...a.map(redact)),
  error: (...a) => console.error(new Date().toISOString(), "ERROR", ...a.map(redact)),
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function randomBetween(min, max) {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(min, max);
  return Math.round(lo + Math.random() * (hi - lo));
}

/** An error a provider can raise. retryable: worth trying again; fatal: stop the whole job. */
export class SendError extends Error {
  constructor(message, { retryable = false, fatal = false, code, retryAfterMs, notOnWhatsApp = false } = {}) {
    super(message);
    this.retryable = retryable;
    this.fatal = fatal;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
    this.notOnWhatsApp = notOnWhatsApp;
  }
}

/**
 * Run fn with retries on retryable errors, using exponential backoff with jitter.
 * onAttempt(attemptNumber) is called before each try.
 */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 2000, onAttempt, wait = sleep } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt);
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (!err.retryable || attempt === maxAttempts) throw err;
      const backoff = err.retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1);
      await wait(backoff + randomBetween(0, baseDelayMs));
    }
  }
  throw lastErr;
}

/** Rolling one-hour cap on sends per channel. */
export class HourlyLimiter {
  constructor(maxPerHour) {
    this.max = maxPerHour;
    this.stamps = [];
  }
  msUntilFree(now = Date.now()) {
    this.stamps = this.stamps.filter((t) => now - t < 3600_000);
    if (!this.max || this.stamps.length < this.max) return 0;
    return 3600_000 - (now - this.stamps[0]) + 1000;
  }
  record(now = Date.now()) {
    this.stamps.push(now);
  }
}
