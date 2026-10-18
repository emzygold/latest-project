// Suppression (do-not-contact) list. Checked immediately before every single send.
import path from "node:path";
import crypto from "node:crypto";
import { readJson, writeJson } from "./store.js";
import { normalizeEmail, normalizePhone } from "./clean.js";

export class SuppressionList {
  constructor(dataDir) {
    this.file = path.join(dataDir, "suppression.json");
    const data = readJson(this.file, { emails: [], phones: [] });
    this.emails = new Map((data.emails || []).map((e) => [e.value, e]));
    this.phones = new Map((data.phones || []).map((e) => [e.value, e]));
  }

  save() {
    writeJson(this.file, { emails: [...this.emails.values()], phones: [...this.phones.values()] });
  }

  static key(type, value) {
    if (type === "email") {
      const e = normalizeEmail(value);
      return e.ok ? e.value.toLowerCase() : String(value).trim().toLowerCase();
    }
    const p = normalizePhone(String(value).startsWith("+") ? value : `+${String(value).replace(/^\+/, "")}`);
    return p.ok ? p.e164 : String(value).replace(/[^\d+]/g, "");
  }

  has(type, value) {
    if (!value) return false;
    const map = type === "email" ? this.emails : this.phones;
    return map.has(SuppressionList.key(type, value));
  }

  add(type, value, source = "manual") {
    if (!value) return false;
    const map = type === "email" ? this.emails : this.phones;
    const key = SuppressionList.key(type, value);
    if (!key) return false;
    if (!map.has(key)) map.set(key, { value: key, source, addedAt: new Date().toISOString() });
    this.save();
    return true;
  }

  remove(type, value) {
    const map = type === "email" ? this.emails : this.phones;
    const ok = map.delete(SuppressionList.key(type, value));
    this.save();
    return ok;
  }

  list() {
    return { emails: [...this.emails.values()], phones: [...this.phones.values()] };
  }
}

// Signed unsubscribe links, so nobody can unsubscribe someone else by editing the URL.
export function unsubscribeToken(email, secret) {
  return crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(email, token, secret) {
  if (!email || !token || !secret) return false;
  const expected = Buffer.from(unsubscribeToken(email, secret));
  const given = Buffer.from(String(token));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function unsubscribeUrl(baseUrl, email, secret) {
  if (!baseUrl || !secret) return "";
  const q = new URLSearchParams({ e: email, t: unsubscribeToken(email, secret) });
  return `${baseUrl}/unsubscribe?${q}`;
}
