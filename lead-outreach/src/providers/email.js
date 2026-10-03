// Email providers: SMTP (any mailbox or service), Resend API, SendGrid API, or mock (logs nothing, sends nothing).
import nodemailer from "nodemailer";
import { SendError } from "../util.js";

const fromHeader = (s) => (s.fromName ? `"${s.fromName.replace(/"/g, "")}" <${s.fromEmail}>` : s.fromEmail);

function listUnsubscribeHeaders(msg, sender) {
  const parts = [];
  if (msg.unsubscribeUrl) parts.push(`<${msg.unsubscribeUrl}>`);
  const mailbox = sender.replyTo || sender.fromEmail;
  if (mailbox) parts.push(`<mailto:${mailbox}?subject=unsubscribe>`);
  const h = {};
  if (parts.length) h["List-Unsubscribe"] = parts.join(", ");
  if (msg.unsubscribeUrl) h["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  return h;
}

/** Classify an HTTP failure from an email API. */
function httpError(status, detail, retryAfter) {
  const retryable = status === 429 || status >= 500;
  const fatal = status === 401 || status === 403;
  return new SendError(`Email API error ${status}${detail ? `: ${detail}` : ""}`, {
    retryable,
    fatal,
    code: status,
    retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : undefined,
  });
}

async function postJson(url, headers, body) {
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch (err) {
    throw new SendError(`Network error: ${err.message}`, { retryable: true });
  }
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try {
      const j = JSON.parse(text);
      detail = j.message || j.errors?.[0]?.message || detail;
    } catch {}
    throw httpError(res.status, detail, res.headers.get("retry-after"));
  }
  try {
    return { json: JSON.parse(text || "{}"), headers: res.headers };
  } catch {
    return { json: {}, headers: res.headers };
  }
}

export function createEmailProvider(cfg, sender) {
  const kind = cfg.provider;

  if (kind === "smtp") {
    const transport = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
    });
    return {
      kind,
      configured: Boolean(cfg.smtp.host && sender.fromEmail),
      async send(msg) {
        try {
          const info = await transport.sendMail({
            from: fromHeader(sender),
            to: msg.to,
            replyTo: sender.replyTo || undefined,
            subject: msg.subject,
            text: msg.text,
            html: msg.html,
            headers: listUnsubscribeHeaders(msg, sender),
          });
          return { id: info.messageId };
        } catch (err) {
          const code = err.responseCode;
          // 4xx SMTP replies and connection problems are temporary; 5xx are permanent.
          const retryable = !code || (code >= 400 && code < 500) || ["ECONNECTION", "ETIMEDOUT", "ESOCKET"].includes(err.code);
          const fatal = err.code === "EAUTH";
          throw new SendError(`SMTP error${code ? ` ${code}` : ""}: ${err.message}`, { retryable: retryable && !fatal, fatal, code });
        }
      },
    };
  }

  if (kind === "resend") {
    return {
      kind,
      configured: Boolean(cfg.resendApiKey && sender.fromEmail),
      async send(msg) {
        const { json } = await postJson(
          "https://api.resend.com/emails",
          { authorization: `Bearer ${cfg.resendApiKey}` },
          {
            from: fromHeader(sender),
            to: [msg.to],
            reply_to: sender.replyTo || undefined,
            subject: msg.subject,
            text: msg.text,
            html: msg.html,
            headers: listUnsubscribeHeaders(msg, sender),
          },
        );
        return { id: json.id };
      },
    };
  }

  if (kind === "sendgrid") {
    return {
      kind,
      configured: Boolean(cfg.sendgridApiKey && sender.fromEmail),
      async send(msg) {
        const { headers } = await postJson(
          "https://api.sendgrid.com/v3/mail/send",
          { authorization: `Bearer ${cfg.sendgridApiKey}` },
          {
            personalizations: [{ to: [{ email: msg.to }] }],
            from: { email: sender.fromEmail, name: sender.fromName || undefined },
            reply_to: sender.replyTo ? { email: sender.replyTo } : undefined,
            subject: msg.subject,
            content: [
              { type: "text/plain", value: msg.text },
              { type: "text/html", value: msg.html },
            ],
            headers: listUnsubscribeHeaders(msg, sender),
          },
        );
        return { id: headers.get("x-message-id") || "" };
      },
    };
  }

  // Mock: pretends to send. Addresses at example.com-style "fail" domains simulate errors for testing.
  const sent = [];
  return {
    kind: "mock",
    configured: true,
    sent,
    async send(msg) {
      if (/@fail\.(test|example)$/i.test(msg.to)) throw new SendError("Mock permanent failure", { code: 550 });
      if (/@flaky\.(test|example)$/i.test(msg.to) && !sent.some((m) => m.to === msg.to && m.flakyTried)) {
        sent.push({ to: msg.to, flakyTried: true });
        throw new SendError("Mock temporary failure", { retryable: true, code: 421 });
      }
      sent.push({ to: msg.to, subject: msg.subject });
      return { id: `mock-${Date.now()}-${sent.length}` };
    },
  };
}
