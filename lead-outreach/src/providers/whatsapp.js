// WhatsApp providers: the official WhatsApp Business Cloud API, or a mock for testing.
//
// About "is this number on WhatsApp?": the Cloud API has no lookup endpoint (the old
// /contacts check belonged to the retired On-Premises API). The official signal is the
// message status: if a number is not on WhatsApp, Meta sends a "failed" status webhook
// with error 131026 ("message undeliverable"). This app records that as
// "Not active on WhatsApp" and puts the lead in the report.
import crypto from "node:crypto";
import { SendError } from "../util.js";

// Cloud API error codes we treat specially. https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
export const WA_ERRORS = {
  NOT_ON_WHATSAPP: [131026],
  RETRYABLE: [4, 80007, 130429, 131000, 131016, 131056, 133004],
  FATAL: [0, 3, 10, 190, 200, 131031, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 135000, 131048],
  RECIPIENT_NOT_ALLOWED: [131030], // test numbers can only message their allowed list
  OUTSIDE_WINDOW: [131047], // free-form text outside the 24-hour customer-service window
};

export function classifyWhatsAppError(code, message) {
  const c = Number(code);
  if (WA_ERRORS.NOT_ON_WHATSAPP.includes(c))
    return new SendError("Not active on WhatsApp (error 131026)", { code: c, notOnWhatsApp: true });
  if (WA_ERRORS.RECIPIENT_NOT_ALLOWED.includes(c))
    return new SendError("Recipient not in the test number's allowed list (131030). Add it in Meta or use a production number.", { code: c });
  if (WA_ERRORS.OUTSIDE_WINDOW.includes(c))
    return new SendError("Outside the 24-hour window: business-initiated messages must use an approved template (131047).", { code: c });
  if (WA_ERRORS.RETRYABLE.includes(c))
    return new SendError(`WhatsApp rate limit or temporary error (${c}): ${message}`, { code: c, retryable: true, retryAfterMs: 60_000 });
  if (WA_ERRORS.FATAL.includes(c))
    return new SendError(`WhatsApp configuration or account problem (${c}): ${message}`, { code: c, fatal: true });
  return new SendError(`WhatsApp error ${c}: ${message}`, { code: c });
}

const digits = (e164) => String(e164).replace(/[^\d]/g, "");

export function buildTemplatePayload(to, { name, language, params = [] }) {
  const components = params.length
    ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text).slice(0, 1024) })) }]
    : [];
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: digits(to),
    type: "template",
    template: { name, language: { code: language || "en" }, ...(components.length ? { components } : {}) },
  };
}

export function buildTextPayload(to, body) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: digits(to),
    type: "text",
    text: { body: String(body).slice(0, 4096), preview_url: false },
  };
}

export function createWhatsAppProvider(cfg, { onStatus } = {}) {
  if (cfg.provider === "cloud") {
    const base = `https://graph.facebook.com/${cfg.apiVersion}`;
    const call = async (method, url, body) => {
      let res;
      try {
        res = await fetch(url, {
          method,
          headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        throw new SendError(`Network error: ${err.message}`, { retryable: true });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        const e = json.error || {};
        if (res.status >= 500 && !e.code) throw new SendError(`WhatsApp API ${res.status}`, { retryable: true });
        throw classifyWhatsAppError(e.code ?? res.status, e.error_data?.details || e.message || `HTTP ${res.status}`);
      }
      return json;
    };
    return {
      kind: "cloud",
      configured: Boolean(cfg.token && cfg.phoneNumberId),
      webhooksConfigured: Boolean(cfg.verifyToken && cfg.appSecret),
      async sendTemplate(to, template) {
        const json = await call("POST", `${base}/${cfg.phoneNumberId}/messages`, buildTemplatePayload(to, template));
        return { id: json.messages?.[0]?.id || "", waId: json.contacts?.[0]?.wa_id || "" };
      },
      async sendText(to, body) {
        const json = await call("POST", `${base}/${cfg.phoneNumberId}/messages`, buildTextPayload(to, body));
        return { id: json.messages?.[0]?.id || "", waId: json.contacts?.[0]?.wa_id || "" };
      },
      /** Look up a template so we can show its status and check it has an opt-out line. */
      async getTemplate(name, language) {
        if (!cfg.wabaId) return null;
        const q = new URLSearchParams({ name, fields: "name,language,status,category,components" });
        const json = await call("GET", `${base}/${cfg.wabaId}/message_templates?${q}`);
        return (json.data || []).find((t) => !language || t.language === language) || null;
      },
    };
  }

  // Mock: pretends to send. Numbers ending in 00 simulate "not on WhatsApp" by firing a
  // failed status after a moment, exactly like the real webhook would.
  const sent = [];
  return {
    kind: "mock",
    configured: true,
    webhooksConfigured: true,
    sent,
    async sendTemplate(to, template) {
      return this._send(to, { template });
    },
    async sendText(to, body) {
      return this._send(to, { body });
    },
    async _send(to, payload) {
      const id = `wamid.mock.${crypto.randomUUID()}`;
      sent.push({ to, ...payload, id });
      if (/00$/.test(digits(to)))
        setTimeout(() => onStatus?.({ id, status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] }), 300);
      else setTimeout(() => onStatus?.({ id, status: "delivered" }), 300);
      return { id };
    },
    async getTemplate(name, language) {
      return { name, language, status: "APPROVED (mock)", components: [] };
    },
  };
}

/** Verify Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifyWebhookSignature(rawBody, header, appSecret) {
  if (!appSecret || !header || !rawBody) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Pull statuses and inbound text messages out of a Cloud API webhook payload. */
export function parseWebhook(body) {
  const statuses = [];
  const messages = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      for (const s of v.statuses || []) statuses.push({ id: s.id, status: s.status, recipient: s.recipient_id, errors: s.errors || [] });
      for (const m of v.messages || [])
        messages.push({ from: m.from, type: m.type, text: m.text?.body || m.button?.text || m.interactive?.button_reply?.title || "" });
    }
  }
  return { statuses, messages };
}

export const isOptOutReply = (text) => /^\s*(stop|unsubscribe|opt[\s-]?out|cancel|remove me|end)\s*[.!]*\s*$/i.test(String(text ?? ""));
