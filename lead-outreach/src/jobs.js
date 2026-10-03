// Job engine: walks the leads in order, sends email then WhatsApp for each, with
// suppression checks, throttling, random delays, retries, pause/resume and live events.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { readJson, writeJson, ensureDir } from "./store.js";
import { composeEmail, finalizeEmail, composeWhatsApp } from "./messages.js";
import { reportReason } from "./report.js";
import { withRetry, randomBetween, sleep as realSleep, HourlyLimiter, log } from "./util.js";

const CHANNELS = ["email", "whatsapp"];
const stateKey = (ch) => (ch === "email" ? "emailState" : "whatsapp");
const WA_RANK = { sent: 1, delivered: 2, read: 3 };

function initialStates(lead, settings) {
  const email = { status: "pending", attempts: 0 };
  if (!settings.email.enabled) Object.assign(email, { status: "skipped", reason: "Email channel off" });
  else if (!lead.emailRaw) Object.assign(email, { status: "skipped", reason: "No email address" });
  else if (!lead.emailValid) Object.assign(email, { status: "skipped", reason: "Invalid email" });
  else if (lead.duplicateEmailOf) Object.assign(email, { status: "skipped", reason: `Duplicate of line ${lead.duplicateEmailOf}` });

  const wa = { status: "pending", attempts: 0 };
  if (!settings.whatsapp.enabled) Object.assign(wa, { status: "skipped", reason: "WhatsApp channel off" });
  else if (lead.phoneStatus === "missing") Object.assign(wa, { status: "skipped", reason: "No phone number" });
  else if (lead.phoneStatus === "invalid") Object.assign(wa, { status: "skipped", reason: "Invalid number format" });
  else if (lead.duplicatePhoneOf) Object.assign(wa, { status: "skipped", reason: `Duplicate of line ${lead.duplicatePhoneOf}` });
  return { emailState: email, whatsapp: wa };
}

export function countJob(job) {
  const c = { total: job.leads.length };
  for (const ch of CHANNELS) {
    const k = { pending: 0, sent: 0, failed: 0, skipped: 0, rendered: 0 };
    for (const l of job.leads) {
      const s = l[stateKey(ch)].status;
      if (s === "pending" || s === "sending") k.pending++;
      else if (s in WA_RANK) k.sent++;
      else k[s] = (k[s] || 0) + 1;
    }
    c[ch] = k;
  }
  c.all = Object.fromEntries(["pending", "sent", "failed", "skipped", "rendered"].map((s) => [s, c.email[s] + c.whatsapp[s]]));
  c.report = job.leads.filter((l) => reportReason(l)).length;
  return c;
}

/** A lead as the dashboard sees it (no rendered message bodies). */
export function publicLead(l) {
  const pick = (s) => ({ status: s.status, reason: s.reason || "", error: s.error || "", attempts: s.attempts || 0, sentAt: s.sentAt || "", note: s.note || "" });
  return {
    id: l.id, line: l.line, name: l.name, email: l.email || l.emailRaw, phone: l.phone, phoneRaw: l.phoneRaw, socials: l.socials,
    emailState: pick(l.emailState), whatsapp: { ...pick(l.whatsapp), notOnWhatsApp: Boolean(l.whatsapp.notOnWhatsApp) },
    reportReason: reportReason(l) || "",
  };
}

export class JobManager extends EventEmitter {
  constructor({ dataDir, emailProvider, waProvider, ai, suppression, appConfig, sleep = realSleep, delays }) {
    super();
    this.setMaxListeners(100);
    this.dir = path.join(dataDir, "jobs");
    ensureDir(this.dir);
    this.email = emailProvider;
    this.wa = waProvider;
    this.ai = ai;
    this.suppression = suppression;
    this.cfg = appConfig;
    this.sleep = sleep;
    this.delays = delays || {
      email: [appConfig.email.minDelayMs, appConfig.email.maxDelayMs],
      whatsapp: [appConfig.whatsapp.minDelayMs, appConfig.whatsapp.maxDelayMs],
    };
    this.limiters = { email: new HourlyLimiter(appConfig.email.maxPerHour), whatsapp: new HourlyLimiter(appConfig.whatsapp.maxPerHour) };
    this.jobs = new Map();
    this.wamidIndex = new Map();
    this.running = new Set();
    this.saveTimers = new Map();
    this.load();
  }

  load() {
    for (const f of fs.readdirSync(this.dir).filter((f) => f.endsWith(".json"))) {
      const job = readJson(path.join(this.dir, f), null);
      if (!job?.id) continue;
      if (job.status === "running") Object.assign(job, { status: "paused", pausedReason: "Interrupted by a server restart. Press Resume to continue." });
      for (const l of job.leads) {
        if (l.emailState.status === "sending") l.emailState.status = "pending";
        if (l.whatsapp.status === "sending") l.whatsapp.status = "pending";
        if (l.whatsapp.wamid) this.wamidIndex.set(l.whatsapp.wamid, { jobId: job.id, leadId: l.id });
      }
      this.jobs.set(job.id, job);
    }
  }

  save(job, now = false) {
    const write = () => {
      this.saveTimers.delete(job.id);
      writeJson(path.join(this.dir, `${job.id}.json`), job);
    };
    if (now) {
      clearTimeout(this.saveTimers.get(job.id));
      return write();
    }
    if (!this.saveTimers.has(job.id)) this.saveTimers.set(job.id, setTimeout(write, 500));
  }

  emitUpdate(job, lead, event) {
    if (event) {
      job.log.push({ at: new Date().toISOString(), ...event });
      if (job.log.length > 1000) job.log.splice(0, job.log.length - 1000);
    }
    this.emit(`job:${job.id}`, { status: job.status, pausedReason: job.pausedReason || "", counts: countJob(job), lead: lead ? publicLead(lead) : null, event: event || null });
    this.save(job);
  }

  list() {
    return [...this.jobs.values()]
      .map((j) => ({ id: j.id, createdAt: j.createdAt, mode: j.mode, status: j.status, sourceName: j.sourceName, counts: countJob(j) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id) {
    return this.jobs.get(id);
  }

  create({ leads, settings, mode, sourceName }) {
    const job = {
      // Letters only, so the log redactor never mistakes a job id for a phone number.
      id: `job-${Array.from(crypto.randomBytes(10), (b) => "abcdefghjkmnpqrstuvwxyz"[b % 23]).join("")}`,
      createdAt: new Date().toISOString(),
      mode: mode === "live" ? "live" : "dry",
      status: "ready",
      sourceName: sourceName || "",
      settings,
      providers: { email: this.email.kind, whatsapp: this.wa.kind, ai: settings.ai.enabled && this.ai.enabled ? this.ai.model : "" },
      leads: leads.map((l) => ({ ...l, ...initialStates(l, settings) })),
      log: [],
    };
    this.jobs.set(job.id, job);
    this.save(job, true);
    log.info(`job ${job.id} created: mode=${job.mode} leads=${job.leads.length}`);
    return job;
  }

  start(id) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    if (this.running.has(id)) {
      // The previous loop is still winding down after a pause: flag it to start again when it exits.
      Object.assign(job, { status: "running", pausedReason: "", restart: true });
      return job;
    }
    if (job.mode === "live") {
      const other = [...this.running].find((j) => this.jobs.get(j)?.mode === "live");
      if (other) throw Object.assign(new Error(`Another live job (${other}) is running. Pause it first.`), { status: 409 });
    }
    job.status = "running";
    job.pausedReason = "";
    this.running.add(id);
    this.emitUpdate(job, null, { type: "job", message: job.mode === "live" ? "Sending started" : "Dry run started" });
    this.loop(job)
      .catch((err) => {
        log.error(`job ${id} crashed: ${err.message}`);
        job.status = "paused";
        job.pausedReason = `Stopped by an unexpected error: ${err.message}`;
      })
      .finally(() => {
        this.running.delete(id);
        const again = job.restart && job.status === "running";
        job.restart = false;
        if (again) return this.start(id);
        this.save(job, true);
        this.emitUpdate(job);
      });
    return job;
  }

  pause(id, reason = "Paused by you") {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    if (job.status === "running") {
      job.status = "paused";
      job.pausedReason = reason;
      this.emitUpdate(job, null, { type: "job", message: reason });
    }
    return job;
  }

  resume(id) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    if (job.status === "running" && this.running.has(id)) return job;
    return this.start(id);
  }

  /** Put failed sends back in the queue (except numbers known not to be on WhatsApp) and resume. */
  retryFailed(id) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    let n = 0;
    for (const l of job.leads) {
      if (l.emailState.status === "failed") Object.assign(l.emailState, { status: "pending", error: "" }) && n++;
      if (l.whatsapp.status === "failed" && !l.whatsapp.notOnWhatsApp) Object.assign(l.whatsapp, { status: "pending", error: "" }) && n++;
    }
    this.emitUpdate(job, null, { type: "job", message: `Retrying ${n} failed send(s)` });
    if (n) this.resume(id);
    return { job, retried: n };
  }

  /** A delay that can be interrupted by pause and continues after resume. */
  async pausableDelay(job, ms) {
    let left = ms;
    while (left > 0 && job.status === "running") {
      const step = Math.min(left, 500);
      await this.sleep(step);
      left -= step;
    }
  }

  async loop(job) {
    for (const lead of job.leads) {
      for (const ch of CHANNELS) {
        if (job.status !== "running") return; // paused: loop restarts from the top on resume
        if (lead[stateKey(ch)].status !== "pending") continue;
        const sent = ch === "email" ? await this.processEmail(job, lead) : await this.processWhatsApp(job, lead);
        if (sent && job.mode === "live" && job.status === "running") {
          const [min, max] = this.delays[ch];
          await this.pausableDelay(job, randomBetween(min, max));
        }
      }
    }
    if (job.status === "running") {
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      this.emitUpdate(job, null, { type: "job", message: job.mode === "live" ? "All sends finished" : "Dry run finished" });
      log.info(`job ${job.id} completed`);
    }
  }

  async rateLimitWait(job, ch) {
    const ms = this.limiters[ch].msUntilFree();
    if (ms > 0) {
      this.emitUpdate(job, null, { type: "job", message: `Hourly ${ch} limit reached: waiting ${Math.ceil(ms / 60000)} min` });
      await this.pausableDelay(job, ms);
    }
  }

  async processEmail(job, lead) {
    const st = lead.emailState;
    if (this.suppression.has("email", lead.email)) {
      Object.assign(st, { status: "skipped", reason: "Unsubscribed (suppression list)" });
      this.emitUpdate(job, lead, { type: "email", leadId: lead.id, message: "skipped: suppressed" });
      return false;
    }
    const ctx = { publicBaseUrl: this.cfg.publicBaseUrl, unsubscribeSecret: this.cfg.unsubscribeSecret, sender: this.cfg.sender };
    const parts = composeEmail(lead, job.settings, ctx);
    let body = parts.body;
    if (job.settings.ai.enabled && this.ai.enabled) {
      const v = await this.ai.vary(body, lead, "email");
      body = v.text;
      st.note = v.note || (v.usedAi ? "AI variation" : "");
    }
    const msg = finalizeEmail(parts, body);
    st.preview = { subject: msg.subject, text: msg.text };

    if (job.mode === "dry") {
      st.status = "rendered";
      this.emitUpdate(job, lead, { type: "email", leadId: lead.id, message: "rendered (dry run)" });
      return false;
    }

    await this.rateLimitWait(job, "email");
    if (job.status !== "running") return false;
    st.status = "sending";
    this.emitUpdate(job, lead);
    try {
      const res = await withRetry(() => this.email.send(msg), {
        maxAttempts: this.cfg.retry.maxAttempts,
        baseDelayMs: this.cfg.retry.baseDelayMs,
        wait: this.sleep,
        onAttempt: () => st.attempts++,
      });
      this.limiters.email.record();
      Object.assign(st, { status: "sent", sentAt: new Date().toISOString(), messageId: res.id || "", error: "" });
      this.emitUpdate(job, lead, { type: "email", leadId: lead.id, message: "sent" });
    } catch (err) {
      Object.assign(st, { status: "failed", error: err.message });
      this.emitUpdate(job, lead, { type: "email", leadId: lead.id, message: `failed: ${err.message}` });
      if (err.fatal) this.pause(job.id, `Email provider problem: ${err.message}. Fix the settings, then Resume.`);
    }
    return true;
  }

  async processWhatsApp(job, lead) {
    const st = lead.whatsapp;
    if (this.suppression.has("phone", lead.phone)) {
      Object.assign(st, { status: "skipped", reason: "Opted out (suppression list)" });
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: "skipped: suppressed" });
      return false;
    }
    const m = composeWhatsApp(lead, job.settings);
    if (m.mode === "text" && job.settings.ai.enabled && this.ai.enabled) {
      const v = await this.ai.vary(m.text, lead, "whatsapp");
      m.text = v.text;
      m.preview = v.text;
      st.note = v.note || (v.usedAi ? "AI variation" : "");
    }
    st.preview = { text: m.preview, mode: m.mode, params: m.params || [] };

    if (job.mode === "dry") {
      st.status = "rendered";
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: "rendered (dry run)" });
      return false;
    }

    await this.rateLimitWait(job, "whatsapp");
    if (job.status !== "running") return false;
    st.status = "sending";
    this.emitUpdate(job, lead);
    try {
      const send = () =>
        m.mode === "template"
          ? this.wa.sendTemplate(lead.phone, { name: m.templateName, language: m.language, params: m.params })
          : this.wa.sendText(lead.phone, m.text);
      const res = await withRetry(send, {
        maxAttempts: this.cfg.retry.maxAttempts,
        baseDelayMs: this.cfg.retry.baseDelayMs,
        wait: this.sleep,
        onAttempt: () => st.attempts++,
      });
      this.limiters.whatsapp.record();
      // "sent" means Meta accepted it. Delivery (or "not on WhatsApp") arrives later by webhook.
      if (st.status === "sending") Object.assign(st, { status: "sent", sentAt: new Date().toISOString(), wamid: res.id, error: "" });
      if (res.id) this.wamidIndex.set(res.id, { jobId: job.id, leadId: lead.id });
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: "accepted by WhatsApp" });
    } catch (err) {
      Object.assign(st, { status: "failed", error: err.message, notOnWhatsApp: Boolean(err.notOnWhatsApp) });
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: `failed: ${err.message}` });
      if (err.fatal) this.pause(job.id, `WhatsApp problem: ${err.message}. Fix it, then Resume.`);
    }
    return true;
  }

  /** Apply a delivery status from the WhatsApp webhook (or the mock provider). */
  handleWhatsAppStatus({ id, status, errors = [] }) {
    const ref = this.wamidIndex.get(id);
    if (!ref) return false;
    const job = this.jobs.get(ref.jobId);
    const lead = job?.leads.find((l) => l.id === ref.leadId);
    if (!lead) return false;
    const st = lead.whatsapp;
    if (status === "failed") {
      const code = errors[0]?.code;
      const notOn = Number(code) === 131026;
      Object.assign(st, {
        status: "failed",
        notOnWhatsApp: notOn,
        error: notOn ? "Not active on WhatsApp (131026)" : `Delivery failed (${code ?? "unknown"}): ${errors[0]?.title || errors[0]?.message || ""}`.trim(),
      });
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: notOn ? "not on WhatsApp" : "delivery failed" });
    } else if (WA_RANK[status] && (WA_RANK[status] > (WA_RANK[st.status] || 0) || st.status === "sending")) {
      st.status = status;
      if (!st.sentAt) st.sentAt = new Date().toISOString();
      this.emitUpdate(job, lead, { type: "whatsapp", leadId: lead.id, message: status });
    }
    return true;
  }
}
