// Central configuration. Every secret comes from environment variables (.env),
// never from source code or the browser.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v !== undefined ? n : d;
};
const bool = (v, d = false) => (v === undefined || v === "" ? d : /^(1|true|yes|on)$/i.test(v));

export function loadConfig(env = process.env) {
  return {
    host: env.HOST || "127.0.0.1",
    port: num(env.PORT, 3100),
    publicBaseUrl: (env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
    adminToken: env.ADMIN_TOKEN || "",
    dataDir: path.resolve(ROOT, env.DATA_DIR || "data"),
    defaultCountry: (env.DEFAULT_COUNTRY || "NG").toUpperCase(),
    unsubscribeSecret: env.UNSUBSCRIBE_SECRET || "",

    sender: {
      fromEmail: env.EMAIL_FROM || "",
      fromName: env.EMAIL_FROM_NAME || "",
      replyTo: env.EMAIL_REPLY_TO || "",
      postalAddress: env.SENDER_POSTAL_ADDRESS || "",
    },

    email: {
      provider: (env.EMAIL_PROVIDER || "mock").toLowerCase(), // smtp | resend | sendgrid | mock
      smtp: {
        host: env.SMTP_HOST || "",
        port: num(env.SMTP_PORT, 587),
        secure: bool(env.SMTP_SECURE, false),
        user: env.SMTP_USER || "",
        pass: env.SMTP_PASS || "",
      },
      resendApiKey: env.RESEND_API_KEY || "",
      sendgridApiKey: env.SENDGRID_API_KEY || "",
      minDelayMs: num(env.EMAIL_MIN_DELAY_MS, 5000),
      maxDelayMs: num(env.EMAIL_MAX_DELAY_MS, 15000),
      maxPerHour: num(env.EMAIL_MAX_PER_HOUR, 200),
    },

    whatsapp: {
      provider: (env.WHATSAPP_PROVIDER || "mock").toLowerCase(), // cloud | mock
      token: env.WHATSAPP_ACCESS_TOKEN || "",
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
      wabaId: env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      apiVersion: env.WHATSAPP_API_VERSION || "v23.0",
      verifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
      appSecret: env.WHATSAPP_APP_SECRET || "",
      minDelayMs: num(env.WHATSAPP_MIN_DELAY_MS, 8000),
      maxDelayMs: num(env.WHATSAPP_MAX_DELAY_MS, 20000),
      maxPerHour: num(env.WHATSAPP_MAX_PER_HOUR, 100),
    },

    retry: {
      maxAttempts: num(env.MAX_SEND_ATTEMPTS, 3),
      baseDelayMs: num(env.RETRY_BASE_DELAY_MS, 2000),
    },

    ai: {
      apiKey: env.ANTHROPIC_API_KEY || "",
      model: env.AI_MODEL || "claude-opus-5-5",
    },

    test: {
      email: env.TEST_EMAIL || "",
      whatsapp: env.TEST_WHATSAPP_NUMBER || "",
    },
  };
}

export const config = loadConfig();
