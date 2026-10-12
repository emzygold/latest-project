// HTTP server: API for the dashboard, unsubscribe page and WhatsApp webhook.
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as defaultConfig, ROOT } from "./config.js";
import { parseCsv, resolveMapping, mapHeaders } from "./csv.js";
import { cleanLeads, resolveCountry, normalizeEmail, normalizePhone } from "./clean.js";
import { buildReportCsv, buildResultsCsv, buildReportRows } from "./report.js";
import { mergeSettings, validateSettings, previewLead, composeEmail, finalizeEmail, composeWhatsApp, DEFAULT_SETTINGS } from "./messages.js";
import { MERGE_FIELDS } from "./template.js";
import { SuppressionList, verifyUnsubscribeToken } from "./suppression.js";
import { createEmailProvider } from "./providers/email.js";
import { createWhatsAppProvider, verifyWebhookSignature, parseWebhook, isOptOutReply } from "./providers/whatsapp.js";
import { createAi } from "./ai.js";
import { JobManager, countJob, publicLead } from "./jobs.js";
import { log, redact } from "./util.js";

const UPLOAD_TTL_MS = 6 * 3600_000;

export function createApp({ config = defaultConfig, emailProvider, waProvider, ai, sleep, delays } = {}) {
  const suppression = new SuppressionList(config.dataDir);
  let jobs;
  const wa = waProvider || createWhatsAppProvider(config.whatsapp, { onStatus: (s) => jobs?.handleWhatsAppStatus(s) });
  const email = emailProvider || createEmailProvider(config.email, config.sender);
  const aiClient = ai || createAi(config.ai);
  jobs = new JobManager({ dataDir: config.dataDir, emailProvider: email, waProvider: wa, ai: aiClient, suppression, appConfig: config, sleep, delays });
  const uploads = new Map(); // in memory only; the original file is never written anywhere
  const ctx = { publicBaseUrl: config.publicBaseUrl, unsubscribeSecret: config.unsubscribeSecret, sender: config.sender };

  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" });
    next();
  });

  // ---------- public routes (no admin login) ----------
  app.get("/healthz", (req, res) => res.json({ ok: true }));

  const unsubPage = (title, body) =>
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    `<style>body{font-family:system-ui,sans-serif;max-width:460px;margin:15vh auto;padding:0 20px;color:#111827}button{font:inherit;padding:10px 18px;border-radius:8px;border:0;background:#111827;color:#fff;cursor:pointer}</style></head><body>${body}</body></html>`;
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  app.get("/unsubscribe", (req, res) => {
    const { e, t } = req.query;
    if (!verifyUnsubscribeToken(String(e || ""), String(t || ""), config.unsubscribeSecret))
      return res.status(400).send(unsubPage("Invalid link", "<h1>This unsubscribe link is not valid.</h1><p>Please reply to the email with UNSUBSCRIBE instead.</p>"));
    res.send(
      unsubPage(
        "Unsubscribe",
        `<h1>Unsubscribe</h1><p>Stop all emails to <b>${escape(e)}</b>?</p><form method="post" action="/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}"><button>Yes, unsubscribe me</button></form>`,
      ),
    );
  });
  // POST is also what mail apps call for one-click List-Unsubscribe.
  app.post("/unsubscribe", express.urlencoded({ extended: false }), (req, res) => {
    const { e, t } = req.query;
    if (!verifyUnsubscribeToken(String(e || ""), String(t || ""), config.unsubscribeSecret)) return res.status(400).send("Invalid link");
    suppression.add("email", String(e), "unsubscribe link");
    log.info("an address unsubscribed via link");
    res.send(unsubPage("Unsubscribed", "<h1>You're unsubscribed.</h1><p>You won't receive any more emails from us.</p>"));
  });

  app.get("/webhooks/whatsapp", (req, res) => {
    if (req.query["hub.mode"] === "subscribe" && config.whatsapp.verifyToken && req.query["hub.verify_token"] === config.whatsapp.verifyToken)
      return res.status(200).send(String(req.query["hub.challenge"] ?? ""));
    res.sendStatus(403);
  });
  app.post("/webhooks/whatsapp", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    if (!verifyWebhookSignature(req.body, req.get("x-hub-signature-256"), config.whatsapp.appSecret)) return res.sendStatus(401);
    let body;
    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.sendStatus(400);
    }
    const { statuses, messages } = parseWebhook(body);
    for (const s of statuses) jobs.handleWhatsAppStatus(s);
    for (const m of messages) {
      if (isOptOutReply(m.text)) {
        suppression.add("phone", `+${m.from}`, "WhatsApp STOP reply");
        log.info("a WhatsApp contact opted out");
      }
    }
    res.sendStatus(200);
  });

  // ---------- admin routes ----------
  if (config.adminToken) {
    app.use((req, res, next) => {
      const [scheme, value] = String(req.get("authorization") || "").split(" ");
      const pass = scheme === "Basic" && value ? Buffer.from(value, "base64").toString().split(":").slice(1).join(":") : "";
      const a = Buffer.from(pass);
      const b = Buffer.from(config.adminToken);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
      res.set("WWW-Authenticate", 'Basic realm="Lead Outreach", charset="UTF-8"').status(401).send("Login required");
    });
  }
  app.use(express.static(path.join(ROOT, "public")));
  app.use("/api", express.json({ limit: "2mb" }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) =>
      /\.(csv|txt)$/i.test(file.originalname) || /csv|text\/plain|excel/i.test(file.mimetype)
        ? cb(null, true)
        : cb(Object.assign(new Error("Please upload a .csv file."), { status: 400 })),
  });

  const getUpload = (id) => {
    const u = uploads.get(id);
    if (!u) throw Object.assign(new Error("Upload not found or expired. Please upload the file again."), { status: 404 });
    return u;
  };
  const cleaned = (u, body = {}) => {
    const country = resolveCountry(body.defaultCountry || u.defaultCountry || config.defaultCountry);
    if (!country) throw Object.assign(new Error("Unknown default country. Use a code like NG, GB, US or +234."), { status: 400 });
    const mapping = resolveMapping(u.headers, body.mapping || u.mapping);
    const result = cleanLeads(u.rows, mapping, { defaultCountry: country });
    return { ...result, mapping, country };
  };
  const sweep = () => {
    const now = Date.now();
    for (const [id, u] of uploads) if (now - u.at > UPLOAD_TTL_MS) uploads.delete(id);
  };

  app.get("/api/config", (req, res) => {
    res.json({
      providers: {
        email: { kind: email.kind, configured: email.configured },
        whatsapp: { kind: wa.kind, configured: wa.configured, webhooks: wa.webhooksConfigured },
        ai: { enabled: aiClient.enabled, model: aiClient.enabled ? aiClient.model : "" },
      },
      unsubscribeLink: Boolean(config.publicBaseUrl && config.unsubscribeSecret),
      sender: { fromEmail: config.sender.fromEmail, fromName: config.sender.fromName, hasPostalAddress: Boolean(config.sender.postalAddress) },
      defaultCountry: config.defaultCountry,
      delays: { email: [config.email.minDelayMs, config.email.maxDelayMs], whatsapp: [config.whatsapp.minDelayMs, config.whatsapp.maxDelayMs] },
      limits: { emailPerHour: config.email.maxPerHour, whatsappPerHour: config.whatsapp.maxPerHour },
      test: { email: config.test.email, whatsapp: config.test.whatsapp },
      mergeFields: MERGE_FIELDS,
      defaults: DEFAULT_SETTINGS,
    });
  });

  app.post("/api/upload", upload.single("file"), (req, res) => {
    sweep();
    if (!req.file) throw Object.assign(new Error("No file received."), { status: 400 });
    const { headers, rows } = parseCsv(req.file.buffer);
    if (!rows.length) throw Object.assign(new Error("The file has headers but no lead rows."), { status: 400 });
    const id = crypto.randomUUID();
    const auto = mapHeaders(headers);
    uploads.set(id, { id, at: Date.now(), name: req.file.originalname, headers, rows, mapping: null, defaultCountry: req.body.defaultCountry });
    log.info(`upload ${id.slice(0, 8)}: ${rows.length} rows, ${headers.length} columns`);
    res.json({ uploadId: id, fileName: req.file.originalname, headers, autoMapping: auto.mapping, mappingWarnings: auto.warnings, rowCount: rows.length });
  });

  app.post("/api/uploads/:id/preview", (req, res) => {
    const u = getUpload(req.params.id);
    const { leads, summary, mapping, country } = cleaned(u, req.body);
    u.mapping = mapping;
    u.defaultCountry = country;
    const auto = mapHeaders(u.headers);
    res.json({
      fileName: u.name,
      headers: u.headers,
      mapping,
      country,
      mappingWarnings: auto.warnings,
      summary: { ...summary, notReachableOnWhatsApp: buildReportRows(leads).length },
      leads: leads.map((l) => ({
        id: l.id, line: l.line, name: l.name, email: l.email || l.emailRaw, emailValid: l.emailValid, phoneRaw: l.phoneRaw, phone: l.phone,
        phoneStatus: l.phoneStatus, socials: l.socials, issues: l.issues,
        suppressed: (l.email && suppression.has("email", l.email)) || (l.phone && suppression.has("phone", l.phone)),
      })),
    });
  });

  app.get("/api/uploads/:id/report.csv", (req, res) => {
    const u = getUpload(req.params.id);
    const { leads } = cleaned(u, { defaultCountry: req.query.country });
    res.attachment("whatsapp-report-before-send.csv").type("text/csv").send(buildReportCsv(leads));
  });

  app.post("/api/uploads/:id/render", async (req, res) => {
    const u = getUpload(req.params.id);
    const settings = mergeSettings(req.body.settings);
    const check = validateSettings(settings, ctx);
    const { leads } = cleaned(u, req.body);
    const limit = Math.min(Number(req.body.limit) || 5, 50);
    const sample = leads.filter((l) => l.emailValid || l.phone).slice(0, limit);
    const previews = [];
    for (const l of sample) {
      const p = previewLead(l, settings, ctx);
      if (settings.ai.enabled && aiClient.enabled && req.body.withAi) {
        if (p.email) {
          const parts = composeEmail(l, settings, ctx);
          const v = await aiClient.vary(parts.body, l, "email");
          p.email.text = finalizeEmail(parts, v.text).text;
          p.email.aiNote = v.note || "AI variation";
        }
        if (p.whatsapp?.mode === "text") {
          const v = await aiClient.vary(p.whatsapp.text, l, "whatsapp");
          p.whatsapp.preview = v.text;
          p.whatsapp.aiNote = v.note || "AI variation";
        }
      }
      previews.push({ ...p, name: l.name, line: l.line });
    }
    res.json({ ...check, previews });
  });

  app.post("/api/test-send", async (req, res) => {
    const u = req.body.uploadId ? uploads.get(req.body.uploadId) : null;
    const settings = mergeSettings(req.body.settings);
    const check = validateSettings(settings, ctx);
    if (check.errors.length) return res.status(400).json({ error: check.errors.join(" ") });
    let lead = { id: 0, name: "Test Lead", firstName: "Test", email: "", emailValid: true, phone: "", socials: "@yourhandle" };
    if (u) {
      const { leads } = cleaned(u, req.body);
      const pick = leads.find((l) => l.id === Number(req.body.leadId)) || leads[0];
      if (pick) lead = { ...pick };
    }
    const results = {};
    const toEmail = normalizeEmail(req.body.toEmail || config.test.email);
    if (settings.email.enabled && req.body.toEmail !== undefined) {
      if (!toEmail.ok) results.email = { ok: false, error: "Enter a valid test email address." };
      else {
        const parts = composeEmail({ ...lead, email: toEmail.value }, settings, ctx);
        const msg = finalizeEmail(parts);
        try {
          await email.send({ ...msg, to: toEmail.value, subject: `[TEST] ${msg.subject}` });
          results.email = { ok: true, provider: email.kind };
        } catch (err) {
          results.email = { ok: false, error: err.message };
        }
      }
    }
    if (settings.whatsapp.enabled && req.body.toPhone !== undefined) {
      const phone = normalizePhone(req.body.toPhone || config.test.whatsapp, req.body.defaultCountry || config.defaultCountry);
      if (!phone.ok) results.whatsapp = { ok: false, error: "Enter a valid test WhatsApp number." };
      else {
        const m = composeWhatsApp(lead, settings);
        try {
          const r = m.mode === "template"
            ? await wa.sendTemplate(phone.e164, { name: m.templateName, language: m.language, params: m.params })
            : await wa.sendText(phone.e164, m.text);
          results.whatsapp = { ok: true, provider: wa.kind, messageId: r.id };
        } catch (err) {
          results.whatsapp = { ok: false, error: err.message };
        }
      }
    }
    log.info(`test send: email=${results.email?.ok ?? "-"} whatsapp=${results.whatsapp?.ok ?? "-"}`);
    res.json({ warnings: check.warnings, results });
  });

  app.get("/api/whatsapp/template", async (req, res) => {
    try {
      const t = await wa.getTemplate(String(req.query.name || ""), String(req.query.language || ""));
      res.json({ template: t });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Create (and start) a job. Live jobs need the typed confirmation phrase.
  app.post("/api/jobs", (req, res) => {
    const u = getUpload(req.body.uploadId);
    const settings = mergeSettings(req.body.settings);
    const check = validateSettings(settings, ctx);
    if (check.errors.length) return res.status(400).json({ error: check.errors.join(" ") });
    const { leads } = cleaned(u, req.body);
    const mode = req.body.mode === "live" ? "live" : "dry";
    if (mode === "live") {
      const expected = `SEND ${leads.length}`;
      if (String(req.body.confirm || "").trim().toUpperCase() !== expected)
        return res.status(400).json({ error: `To send for real, type the confirmation exactly: ${expected}`, expected });
      if (settings.email.enabled && !email.configured) return res.status(400).json({ error: "The email provider isn't configured. Check your .env." });
      if (settings.whatsapp.enabled && !wa.configured) return res.status(400).json({ error: "WhatsApp isn't configured. Check your .env." });
    }
    const job = jobs.create({ leads, settings, mode, sourceName: u.name });
    jobs.start(job.id);
    res.json({ jobId: job.id, mode, warnings: check.warnings });
  });

  app.get("/api/jobs", (req, res) => res.json({ jobs: jobs.list() }));

  const getJob = (id) => {
    const j = jobs.get(id);
    if (!j) throw Object.assign(new Error("Job not found"), { status: 404 });
    return j;
  };

  app.get("/api/jobs/:id", (req, res) => {
    const j = getJob(req.params.id);
    res.json({
      id: j.id, createdAt: j.createdAt, mode: j.mode, status: j.status, pausedReason: j.pausedReason || "", sourceName: j.sourceName,
      providers: j.providers, counts: countJob(j), leads: j.leads.map(publicLead), log: j.log.slice(-200),
    });
  });

  app.get("/api/jobs/:id/leads/:leadId", (req, res) => {
    const l = getJob(req.params.id).leads.find((x) => x.id === Number(req.params.leadId));
    if (!l) return res.status(404).json({ error: "Lead not found" });
    res.json({ ...publicLead(l), emailPreview: l.emailState.preview || null, whatsappPreview: l.whatsapp.preview || null });
  });

  app.get("/api/jobs/:id/events", (req, res) => {
    const j = getJob(req.params.id);
    res.set({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.flushHeaders();
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ status: j.status, pausedReason: j.pausedReason || "", counts: countJob(j) });
    const handler = (d) => send(d);
    jobs.on(`job:${j.id}`, handler);
    const ping = setInterval(() => res.write(": ping\n\n"), 20000);
    req.on("close", () => {
      clearInterval(ping);
      jobs.off(`job:${j.id}`, handler);
    });
  });

  app.post("/api/jobs/:id/pause", (req, res) => res.json({ status: jobs.pause(getJob(req.params.id).id).status }));
  app.post("/api/jobs/:id/resume", (req, res) => res.json({ status: jobs.resume(getJob(req.params.id).id).status }));
  app.post("/api/jobs/:id/retry", (req, res) => res.json({ retried: jobs.retryFailed(getJob(req.params.id).id).retried }));

  app.get("/api/jobs/:id/report.csv", (req, res) => {
    const j = getJob(req.params.id);
    res.attachment(`whatsapp-report-${j.id}.csv`).type("text/csv").send(buildReportCsv(j.leads));
  });
  app.get("/api/jobs/:id/results.csv", (req, res) => {
    const j = getJob(req.params.id);
    res.attachment(`results-${j.id}.csv`).type("text/csv").send(buildResultsCsv(j.leads));
  });

  app.get("/api/suppression", (req, res) => res.json(suppression.list()));
  app.post("/api/suppression", (req, res) => {
    const { type, value } = req.body || {};
    if (!["email", "phone"].includes(type) || !value) return res.status(400).json({ error: "type must be email or phone, with a value" });
    suppression.add(type, value, "manual");
    res.json(suppression.list());
  });
  app.delete("/api/suppression", (req, res) => {
    const { type, value } = req.body || {};
    suppression.remove(type, value);
    res.json(suppression.list());
  });

  app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
    if (status >= 500) log.error(`${req.method} ${req.path}: ${redact(err.stack || err.message)}`);
    res.status(status).json({ error: status === 413 ? "File too large (max 5 MB)." : err.message || "Server error" });
  });

  return { app, jobs, suppression, uploads, email, wa };
}

// Start the server when run directly (node src/server.js).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app, email, wa } = createApp();
  app.listen(defaultConfig.port, defaultConfig.host, () => {
    log.info(`Lead Outreach running at http://${defaultConfig.host}:${defaultConfig.port}`);
    log.info(`email provider: ${email.kind}${email.configured ? "" : " (NOT configured)"}, whatsapp provider: ${wa.kind}${wa.configured ? "" : " (NOT configured)"}`);
    if (email.kind === "mock" || wa.kind === "mock") log.warn("Mock provider active: nothing is really sent on that channel.");
    if (defaultConfig.host !== "127.0.0.1" && !defaultConfig.adminToken) log.warn("Listening beyond localhost without ADMIN_TOKEN. Set one before exposing this app.");
  });
}
