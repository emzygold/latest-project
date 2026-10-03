// End-to-end tests through the HTTP API with mock providers and no real delays.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import { createApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { createEmailProvider } from "../src/providers/email.js";
import { checkVariation, createAi } from "../src/ai.js";
import { unsubscribeUrl } from "../src/suppression.js";
import { SendError } from "../src/util.js";

const SAMPLE = path.resolve(import.meta.dirname, "../samples/leads-sample.csv");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lead-outreach-test-"));
const cfg = loadConfig({
  DATA_DIR: tmp, DEFAULT_COUNTRY: "US", PUBLIC_BASE_URL: "http://localhost:9", UNSUBSCRIBE_SECRET: "test-secret",
  WHATSAPP_APP_SECRET: "app-secret", WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-me", EMAIL_FROM: "me@example.com", RETRY_BASE_DELAY_MS: "1",
});
const noSleep = async () => {};
let server, base, ctx;
const sampleBytes = fs.readFileSync(SAMPLE);

before(async () => {
  ctx = createApp({ config: cfg, sleep: noSleep, delays: { email: [0, 0], whatsapp: [0, 0] } });
  server = ctx.app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const post = (p, body) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
async function upload() {
  const fd = new FormData();
  fd.append("file", new Blob([sampleBytes], { type: "text/csv" }), "leads-sample.csv");
  fd.append("defaultCountry", "US");
  const res = await fetch(`${base}/api/upload`, { method: "POST", body: fd });
  return res.json();
}
async function waitForJob(id, done = (j) => ["completed", "paused"].includes(j.status)) {
  let j;
  for (let i = 0; i < 200; i++) {
    j = await (await fetch(`${base}/api/jobs/${id}`)).json();
    if (done(j)) return j;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`job did not reach the expected state (status ${j.status}, counts ${JSON.stringify(j.counts?.all)})`);
}
const settings = { whatsapp: { templateName: "lead_intro", templateParams: ["{{first_name}}"] } };

test("upload never modifies the original file", async () => {
  const before = crypto.createHash("sha256").update(fs.readFileSync(SAMPLE)).digest("hex");
  await upload();
  const after = crypto.createHash("sha256").update(fs.readFileSync(SAMPLE)).digest("hex");
  assert.equal(after, before);
});

test("preview shows row count and validation problems before sending", async () => {
  const u = await upload();
  assert.equal(u.rowCount, 10);
  const p = await (await post(`/api/uploads/${u.uploadId}/preview`, { defaultCountry: "US" })).json();
  assert.equal(p.summary.leads, 10);
  assert.equal(p.summary.invalidEmails, 1);
  assert.equal(p.summary.invalidPhones, 1);
  assert.equal(p.summary.missingPhones, 1);
  assert.equal(p.summary.duplicateEmails, 1);
  assert.equal(p.summary.duplicatePhones, 1);
  assert.equal(p.summary.notReachableOnWhatsApp, 2);
});

test("a live job needs the exact typed confirmation", async () => {
  const u = await upload();
  for (const confirm of [undefined, "yes", "SEND 9"]) {
    const res = await post("/api/jobs", { uploadId: u.uploadId, defaultCountry: "US", mode: "live", settings, confirm });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /SEND 10/);
  }
  assert.equal(ctx.email.sent.length, 0, "nothing was sent");
});

test("a dry run renders every message and sends nothing", async () => {
  const u = await upload();
  const sentBefore = ctx.email.sent.length + ctx.wa.sent.length;
  const { jobId } = await (await post("/api/jobs", { uploadId: u.uploadId, defaultCountry: "US", mode: "dry", settings })).json();
  const j = await waitForJob(jobId);
  assert.equal(j.status, "completed");
  assert.equal(j.counts.all.sent, 0);
  assert.equal(j.counts.email.rendered, 8);
  assert.equal(j.counts.whatsapp.rendered, 7);
  assert.equal(ctx.email.sent.length + ctx.wa.sent.length, sentBefore);
  const lead = await (await fetch(`${base}/api/jobs/${jobId}/leads/1`)).json();
  assert.match(lead.emailPreview.text, /Hi Ada/);
  assert.match(lead.emailPreview.text, /unsubscribe\?e=/);
});

test("a confirmed live job sends, honours suppression, and builds the report", async () => {
  ctx.suppression.add("email", "ngozi.umeh@example.com");
  const u = await upload();
  const res = await post("/api/jobs", { uploadId: u.uploadId, defaultCountry: "US", mode: "live", confirm: "send 10", settings });
  assert.equal(res.status, 200);
  const { jobId } = await res.json();
  // Wait for the job and for the mock "not on WhatsApp" status webhook to land.
  const j = await waitForJob(jobId, (x) => x.status === "completed" && x.counts.report === 3);
  const byName = Object.fromEntries(j.leads.map((l) => [l.name || "(none)", l]));
  assert.equal(byName["Ngozi Umeh"].emailState.status, "skipped");
  assert.match(byName["Ngozi Umeh"].emailState.reason, /suppression/);
  assert.equal(byName["Ada Okafor"].emailState.status, "sent");
  assert.equal(byName["Dr. John Doe"].whatsapp.notOnWhatsApp, true);
  assert.equal(byName["Kemi Adeyemi"].whatsapp.status, "skipped", "duplicate phone");
  assert.equal(byName["Ada Okafor (2)"].emailState.status, "skipped", "duplicate email");

  const report = parse(await (await fetch(`${base}/api/jobs/${jobId}/report.csv`)).text(), { bom: true, columns: true });
  assert.deepEqual(report.map((r) => [r.Name, r.Reason, r["Email Status"]]), [
    ["Chioma Eze", "No phone number", "Sent"],
    ["Grace Smith", "Invalid number format", "Sent"],
    ["Dr. John Doe", "Not active on WhatsApp", "Sent"],
  ]);
  const results = parse(await (await fetch(`${base}/api/jobs/${jobId}/results.csv`)).text(), { bom: true, columns: true });
  assert.equal(results.length, 10);
  // Every sent WhatsApp went to the approved template with a rendered parameter.
  assert.ok(ctx.wa.sent.every((m) => m.template?.name === "lead_intro" && m.template.params[0]));
});

test("pause stops sending and resume finishes the job", async (t) => {
  // Use small real delays so there is time to pause mid-job.
  const { jobs } = ctx;
  const saved = { sleep: jobs.sleep, delays: jobs.delays };
  jobs.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  jobs.delays = { email: [40, 40], whatsapp: [40, 40] };
  t.after(() => Object.assign(jobs, saved));
  const u = await upload();
  const { jobId } = await (await post("/api/jobs", { uploadId: u.uploadId, defaultCountry: "US", mode: "live", confirm: "SEND 10", settings })).json();
  await post(`/api/jobs/${jobId}/pause`, {});
  const paused = await waitForJob(jobId, (j) => j.status === "paused");
  assert.ok(paused.counts.all.pending > 0);
  await post(`/api/jobs/${jobId}/resume`, {});
  const done = await waitForJob(jobId, (j) => j.status === "completed");
  assert.equal(done.counts.all.pending, 0);
});

test("WhatsApp webhook: verification, signature check, statuses and STOP opt-out", async () => {
  const v = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`);
  assert.equal(await v.text(), "42");
  assert.equal((await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`)).status, 403);

  const payload = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "12025550143", type: "text", text: { body: "STOP" } }] } }] }] });
  const unsigned = await fetch(`${base}/webhooks/whatsapp`, { method: "POST", headers: { "content-type": "application/json" }, body: payload });
  assert.equal(unsigned.status, 401);
  const sig = `sha256=${crypto.createHmac("sha256", "app-secret").update(payload).digest("hex")}`;
  const signed = await fetch(`${base}/webhooks/whatsapp`, { method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": sig }, body: payload });
  assert.equal(signed.status, 200);
  assert.ok(ctx.suppression.has("phone", "+12025550143"));
});

test("unsubscribe link adds the address to the suppression list", async () => {
  const url = unsubscribeUrl(base, "tunde.bello@example.com", "test-secret");
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(url.replace(/t=[^&]+/, "t=forged"), { method: "POST" })).status, 400);
  assert.equal((await fetch(url, { method: "POST" })).status, 200);
  assert.ok(ctx.suppression.has("email", "TUNDE.BELLO@example.com"));
});

test("test-send goes to your own address with a [TEST] subject", async () => {
  const before = ctx.email.sent.length;
  const r = await (await post("/api/test-send", { settings, toEmail: "me@example.com", toPhone: "+1 202 555 0111" })).json();
  assert.equal(r.results.email.ok, true);
  assert.equal(r.results.whatsapp.ok, true);
  const last = ctx.email.sent.at(-1);
  assert.equal(ctx.email.sent.length, before + 1);
  assert.equal(last.to, "me@example.com");
  assert.match(last.subject, /^\[TEST\]/);
});

test("temporary email failures are retried; permanent ones are not", async () => {
  const provider = createEmailProvider({ provider: "mock" }, {});
  const { withRetry } = await import("../src/util.js");
  let attempts = 0;
  await withRetry(() => provider.send({ to: "a@flaky.test", subject: "x" }), { maxAttempts: 3, baseDelayMs: 1, wait: noSleep, onAttempt: () => attempts++ });
  assert.equal(attempts, 2);
  attempts = 0;
  await assert.rejects(withRetry(() => provider.send({ to: "a@fail.test" }), { maxAttempts: 3, wait: noSleep, onAttempt: () => attempts++ }));
  assert.equal(attempts, 1);
});

test("AI variations that invent facts are rejected and the original is used", async () => {
  const original = "Hi Ada, I loved your page @adabakes. Can we chat this week?";
  const lead = { id: 1, name: "Ada Okafor", firstName: "Ada", email: "ada@example.com", socials: "@adabakes" };
  assert.deepEqual(checkVariation(original, "Hello Ada, your page @adabakes is great. Free for a chat this week?", lead), []);
  assert.ok(checkVariation(original, "Hi Ada, congrats on 10k followers on @adabakes! Chat this week?", lead).some((p) => /number/.test(p)));
  assert.ok(checkVariation(original, "Hi Ada, saw https://adabakes.ng. Can we chat this week?", lead).some((p) => /link/.test(p)));
  assert.ok(checkVariation("Hi. Reply STOP to opt out.", "Hi there friend.", lead).some((p) => /opt-out/.test(p)));

  const fake = (text, stop_reason = "end_turn") => ({ beta: { messages: { create: async () => ({ stop_reason, content: [{ type: "text", text }] }) } } });
  const good = await createAi({ model: "m" }, fake("Hello Ada, your page @adabakes is lovely. Free to chat this week?")).vary(original, lead, "email");
  assert.equal(good.usedAi, true);
  const invented = await createAi({ model: "m" }, fake("Hi Ada, loved your 5 Lagos shops! Chat this week?")).vary(original, lead, "email");
  assert.equal(invented.text, original);
  assert.match(invented.note, /rejected/);
  const refused = await createAi({ model: "m" }, fake("", "refusal")).vary(original, lead, "email");
  assert.equal(refused.text, original);
  const broken = await createAi({ model: "m" }, { beta: { messages: { create: async () => { throw new SendError("boom"); } } } }).vary(original, lead, "email");
  assert.equal(broken.text, original);
});

test("logs never contain lead emails, phone numbers or secrets", async () => {
  const { redact } = await import("../src/util.js");
  const out = redact("failed for ada@example.com at +234 803 123 4567 with Bearer abc123 and api_key=sk-xyz");
  assert.ok(!/ada@example\.com|803 123 4567|abc123|sk-xyz/.test(out), out);
});
