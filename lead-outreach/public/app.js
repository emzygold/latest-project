// Lead Outreach front end. All lead data is inserted as text (never as HTML).
const $ = (s) => document.querySelector(s);
const state = { config: null, upload: null, preview: null, jobId: null, job: null, events: null };
const SETTINGS_KEY = "lead-outreach-settings-v1"; // templates only, never lead data

// ---------- helpers ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: opts.body && !(opts.body instanceof FormData) ? { "content-type": "application/json" } : undefined,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { data });
  return data;
}
const showError = (el, msg) => {
  el.textContent = msg || "";
  el.classList.toggle("hidden", !msg);
};
const stat = (label, value, cls = "") => h("div", { class: `stat ${cls}` }, h("b", {}, value), h("span", {}, label));
const badge = (status) => h("span", { class: `badge s-${status}` }, status);

function goto(step) {
  document.querySelectorAll("#steps button").forEach((b) => b.classList.toggle("active", b.dataset.step === step));
  document.querySelectorAll(".step").forEach((s) => s.classList.toggle("active", s.id === `step-${step}`));
  if (step === "send") refreshSendStep();
  if (step === "jobs") loadJobs();
  if (step === "suppression") loadSuppression();
  if (step === "messages") checkSettings();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll("#steps button").forEach((b) => b.addEventListener("click", () => goto(b.dataset.step)));
document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));

// ---------- config ----------
const COUNTRIES = [
  ["NG", "Nigeria (+234)"], ["GH", "Ghana (+233)"], ["KE", "Kenya (+254)"], ["ZA", "South Africa (+27)"], ["EG", "Egypt (+20)"],
  ["GB", "United Kingdom (+44)"], ["US", "United States (+1)"], ["CA", "Canada (+1)"], ["IN", "India (+91)"], ["AE", "UAE (+971)"],
  ["DE", "Germany (+49)"], ["FR", "France (+33)"], ["ES", "Spain (+34)"], ["IT", "Italy (+39)"], ["NL", "Netherlands (+31)"],
  ["AU", "Australia (+61)"], ["BR", "Brazil (+55)"], ["SA", "Saudi Arabia (+966)"], ["PK", "Pakistan (+92)"], ["PH", "Philippines (+63)"],
];

async function loadConfig() {
  const c = (state.config = await api("/api/config"));
  const p = c.providers;
  const pill = (label, ok, warn) => h("span", { class: `pill ${ok ? (warn ? "warn" : "ok") : "warn"}` }, label);
  $("#providerStatus").replaceChildren(
    pill(`Email: ${p.email.kind}${p.email.configured ? "" : " (not set up)"}`, p.email.configured, p.email.kind === "mock"),
    pill(`WhatsApp: ${p.whatsapp.kind}${p.whatsapp.configured ? "" : " (not set up)"}`, p.whatsapp.configured, p.whatsapp.kind === "mock"),
    pill(p.ai.enabled ? `AI: ${p.ai.model}` : "AI: off", p.ai.enabled, false),
  );
  const sel = $("#countrySelect");
  const list = COUNTRIES.some(([k]) => k === c.defaultCountry) ? COUNTRIES : [[c.defaultCountry, c.defaultCountry], ...COUNTRIES];
  sel.replaceChildren(...list.map(([k, n]) => h("option", { value: k, selected: k === c.defaultCountry }, n)));
  $("#fieldChips").replaceChildren(
    ...Object.entries(c.mergeFields).map(([k, f]) => h("button", { type: "button", class: "chip", title: f.label, onclick: () => insertField(`{{${k}}}`) }, `{{${k}}}`)),
    h("button", { type: "button", class: "chip", title: "Only shown when the lead has socials", onclick: () => insertField("{{#socials}} ({{socials}}){{/socials}}") }, "{{#socials}}…{{/socials}}"),
  );
  $("#aiEnabled").disabled = !p.ai.enabled;
  $("#previewAi").disabled = !p.ai.enabled;
  if (!p.ai.enabled) $("#aiInfo").append(h("b", {}, " Set ANTHROPIC_API_KEY in .env to turn this on."));
  if (c.test.email) $("#testEmail").value = c.test.email;
  if (c.test.whatsapp) $("#testPhone").value = c.test.whatsapp;
  loadSettings(c.defaults);
}

// ---------- step 1: upload & preview ----------
$("#uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showError($("#uploadError"), "");
  const file = $("#fileInput").files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("defaultCountry", $("#countrySelect").value);
  try {
    state.upload = await api("/api/upload", { method: "POST", body: fd });
    renderMapping();
    await runPreview();
  } catch (err) {
    showError($("#uploadError"), err.message);
  }
});

const MAP_FIELDS = [["name", "Name"], ["first_name", "First name (optional)"], ["last_name", "Last name (optional)"], ["email", "Email"], ["phone", "Phone number"], ["socials", "Socials (optional)"]];
function renderMapping() {
  const u = state.upload;
  $("#mappingCard").classList.remove("hidden");
  $("#fileInfo").textContent = `${u.fileName}: ${u.rowCount} data rows, ${u.headers.length} columns.`;
  $("#mappingFields").replaceChildren(
    ...MAP_FIELDS.map(([field, label]) =>
      h("label", {}, label,
        h("select", { "data-field": field },
          h("option", { value: "" }, "(not in file)"),
          ...u.headers.map((hd, i) => h("option", { value: i, selected: u.autoMapping[field] === i }, hd || `(column ${i + 1})`)))),
    ),
  );
}
function currentMapping() {
  const m = {};
  document.querySelectorAll("#mappingFields select").forEach((s) => (m[s.dataset.field] = s.value === "" ? -1 : Number(s.value)));
  return m;
}
$("#previewBtn").addEventListener("click", () => runPreview().catch((err) => showError($("#uploadError"), err.message)));

async function runPreview() {
  const p = (state.preview = await api(`/api/uploads/${state.upload.uploadId}/preview`, {
    method: "POST",
    body: { mapping: currentMapping(), defaultCountry: $("#countrySelect").value },
  }));
  $("#mappingWarnings").replaceChildren(...p.mappingWarnings.map((w) => h("li", {}, w)));
  const s = p.summary;
  $("#previewCard").classList.remove("hidden");
  $("#summary").replaceChildren(
    stat("Leads", s.leads, "info"),
    stat("Valid emails", s.validEmails, "ok"),
    stat("Invalid emails", s.invalidEmails, s.invalidEmails ? "bad" : ""),
    stat("Missing emails", s.missingEmails, s.missingEmails ? "warn" : ""),
    stat("Valid phones", s.validPhones, "ok"),
    stat("Invalid phones", s.invalidPhones, s.invalidPhones ? "bad" : ""),
    stat("Missing phones", s.missingPhones, s.missingPhones ? "warn" : ""),
    stat("Duplicates", s.duplicateEmails + s.duplicatePhones, s.duplicateEmails + s.duplicatePhones ? "warn" : ""),
    stat("In WhatsApp report", s.notReachableOnWhatsApp, s.notReachableOnWhatsApp ? "warn" : ""),
    stat("Blank rows skipped", s.blankRows),
  );
  $("#preReportLink").href = `/api/uploads/${state.upload.uploadId}/report.csv?country=${encodeURIComponent(p.country)}`;
  renderPreviewTable();
  refreshSendStep();
}
$("#onlyIssues").addEventListener("change", renderPreviewTable);
function renderPreviewTable() {
  const only = $("#onlyIssues").checked;
  const rows = state.preview.leads.filter((l) => !only || l.issues.length || l.suppressed);
  $("#previewTable").replaceChildren(
    h("thead", {}, h("tr", {}, ...["Line", "Name", "Email", "Phone (cleaned)", "Socials", "Issues"].map((t) => h("th", {}, t)))),
    h("tbody", {}, ...rows.map((l) =>
      h("tr", {},
        h("td", {}, l.line),
        h("td", {}, l.name || h("span", { class: "muted" }, "—")),
        h("td", {}, l.email || h("span", { class: "muted" }, "—")),
        h("td", {}, l.phone || h("span", { class: "muted" }, l.phoneRaw || "—")),
        h("td", {}, l.socials || h("span", { class: "muted" }, "—")),
        h("td", {}, ...l.issues.map((i) => h("span", { class: `issue ${i.level}` }, i.message)), l.suppressed ? h("span", { class: "issue warning" }, "On do-not-contact list") : null),
      ))),
  );
}

// ---------- step 2: messages ----------
let lastTpl = null;
document.addEventListener("focusin", (e) => { if (e.target.classList?.contains("tpl")) lastTpl = e.target; });
function insertField(text) {
  const el = lastTpl || $("#emailBody");
  const [a, b] = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length];
  el.value = el.value.slice(0, a) + text + el.value.slice(b);
  el.focus();
  el.selectionStart = el.selectionEnd = a + text.length;
  saveSettings();
}
function getSettings() {
  return {
    email: { enabled: $("#emailEnabled").checked, subject: $("#emailSubject").value, body: $("#emailBody").value },
    whatsapp: {
      enabled: $("#waEnabled").checked,
      mode: document.querySelector("input[name=waMode]:checked").value,
      templateName: $("#waTemplateName").value.trim(),
      templateLanguage: $("#waTemplateLanguage").value.trim() || "en",
      templateParams: $("#waTemplateParams").value.split("\n").map((s) => s.trim()).filter(Boolean),
      templateBody: $("#waTemplateBody").value,
      text: $("#waText").value,
    },
    ai: { enabled: $("#aiEnabled").checked && !$("#aiEnabled").disabled },
  };
}
function loadSettings(defaults) {
  let s = defaults;
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (saved) s = { email: { ...defaults.email, ...saved.email }, whatsapp: { ...defaults.whatsapp, ...saved.whatsapp }, ai: { ...defaults.ai, ...saved.ai } };
  } catch {}
  $("#emailEnabled").checked = s.email.enabled;
  $("#emailSubject").value = s.email.subject;
  $("#emailBody").value = s.email.body;
  $("#waEnabled").checked = s.whatsapp.enabled;
  document.querySelector(`input[name=waMode][value=${s.whatsapp.mode === "text" ? "text" : "template"}]`).checked = true;
  $("#waTemplateName").value = s.whatsapp.templateName;
  $("#waTemplateLanguage").value = s.whatsapp.templateLanguage;
  $("#waTemplateParams").value = (s.whatsapp.templateParams || []).join("\n");
  $("#waTemplateBody").value = s.whatsapp.templateBody;
  $("#waText").value = s.whatsapp.text;
  $("#aiEnabled").checked = Boolean(s.ai.enabled) && !$("#aiEnabled").disabled;
  syncWaMode();
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettings())); } catch {}
}
function syncWaMode() {
  const tpl = document.querySelector("input[name=waMode]:checked").value === "template";
  $("#waTemplateFields").classList.toggle("hidden", !tpl);
  $("#waTextFields").classList.toggle("hidden", tpl);
}
document.querySelectorAll("input[name=waMode]").forEach((r) => r.addEventListener("change", () => { syncWaMode(); saveSettings(); checkSettings(); }));
document.querySelectorAll("#step-messages input, #step-messages textarea").forEach((el) => el.addEventListener("input", () => { saveSettings(); clearTimeout(checkSettings.t); checkSettings.t = setTimeout(checkSettings, 400); }));

async function checkSettings() {
  if (!state.upload) {
    $("#settingsProblems").replaceChildren(h("li", {}, "Upload a CSV first to check your messages against real leads."));
    return null;
  }
  try {
    const r = await api(`/api/uploads/${state.upload.uploadId}/render`, { method: "POST", body: { settings: getSettings(), mapping: currentMapping(), defaultCountry: $("#countrySelect").value, limit: 1 } });
    $("#settingsProblems").replaceChildren(...r.errors.map((e) => h("li", { class: "err" }, e)), ...r.warnings.map((w) => h("li", {}, w)));
    return r;
  } catch (err) {
    $("#settingsProblems").replaceChildren(h("li", { class: "err" }, err.message));
    return null;
  }
}

$("#checkTemplateBtn").addEventListener("click", async () => {
  const out = $("#templateCheck");
  out.textContent = "Checking…";
  try {
    const { template } = await api(`/api/whatsapp/template?name=${encodeURIComponent($("#waTemplateName").value.trim())}&language=${encodeURIComponent($("#waTemplateLanguage").value.trim())}`);
    if (!template) return (out.textContent = "Not found, or WHATSAPP_BUSINESS_ACCOUNT_ID isn't set (needed for this check).");
    const body = (template.components || []).find((c) => c.type === "BODY")?.text;
    out.textContent = `Status: ${template.status}${template.category ? ` · ${template.category}` : ""}`;
    if (body) {
      $("#waTemplateBody").value = body;
      saveSettings();
      if (!/stop|opt.?out|unsubscribe/i.test(body)) out.textContent += " · ⚠ No opt-out line in this template.";
    }
  } catch (err) {
    out.textContent = err.message;
  }
});

// ---------- step 3: review & test ----------
$("#renderBtn").addEventListener("click", async () => {
  if (!state.upload) return goto("upload");
  $("#renderOut").replaceChildren(h("p", { class: "muted" }, "Rendering…"));
  try {
    const r = await api(`/api/uploads/${state.upload.uploadId}/render`, {
      method: "POST",
      body: { settings: getSettings(), mapping: currentMapping(), defaultCountry: $("#countrySelect").value, limit: 5, withAi: $("#previewAi").checked },
    });
    $("#renderProblems").replaceChildren(...r.errors.map((e) => h("li", { class: "err" }, e)), ...r.warnings.map((w) => h("li", {}, w)));
    $("#renderOut").replaceChildren(...r.previews.map(previewCard));
  } catch (err) {
    $("#renderOut").replaceChildren(h("p", { class: "error" }, err.message));
  }
});
function previewCard(p) {
  return h("div", { class: "preview" },
    h("h4", {}, `Line ${p.line}: ${p.name || "(no name)"}`),
    p.email ? [h("div", { class: "label" }, `Email to ${p.email.to}`), h("pre", {}, `Subject: ${p.email.subject}\n\n${p.email.text}`), p.email.aiNote ? h("div", { class: "muted small" }, p.email.aiNote) : null]
      : h("div", { class: "label" }, "No email (missing or invalid address)"),
    p.whatsapp ? [h("div", { class: "label" }, `WhatsApp to ${p.whatsapp.to} (${p.whatsapp.mode === "template" ? `template "${p.whatsapp.templateName}"` : "free text"})`), h("pre", {}, p.whatsapp.preview), p.whatsapp.aiNote ? h("div", { class: "muted small" }, p.whatsapp.aiNote) : null]
      : h("div", { class: "label" }, "No WhatsApp (missing or invalid number): goes in the report"),
  );
}
$("#testForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = $("#testOut");
  out.textContent = "Sending test…";
  const body = { settings: getSettings(), uploadId: state.upload?.uploadId, mapping: state.upload ? currentMapping() : undefined, defaultCountry: $("#countrySelect").value };
  if ($("#testEmail").value.trim()) body.toEmail = $("#testEmail").value.trim();
  if ($("#testPhone").value.trim()) body.toPhone = $("#testPhone").value.trim();
  if (!body.toEmail && !body.toPhone) return (out.textContent = "Enter your email and/or WhatsApp number.");
  try {
    const r = await api("/api/test-send", { method: "POST", body });
    const line = (ch, x) => (x ? `${ch}: ${x.ok ? `sent via ${x.provider}${x.provider === "mock" ? " (mock: nothing really sent)" : ""}` : `failed: ${x.error}`}` : null);
    out.replaceChildren(...[line("Email", r.results.email), line("WhatsApp", r.results.whatsapp)].filter(Boolean).map((t) => h("div", {}, t)));
  } catch (err) {
    out.textContent = err.message;
  }
});

// ---------- step 4: send ----------
function refreshSendStep() {
  const n = state.preview?.summary.leads ?? 0;
  $("#confirmPhrase").textContent = `SEND ${n}`;
  const c = state.config;
  const s = getSettings();
  const items = [];
  if (!state.preview) items.push(["bad", "Upload and preview a CSV first."]);
  else items.push(["ok", `${n} leads loaded from ${state.preview.fileName}.`]);
  if (c) {
    if (s.email.enabled) items.push(c.providers.email.kind === "mock" ? ["warn", "Email provider is MOCK: nothing will really be emailed."] : c.providers.email.configured ? ["ok", `Email via ${c.providers.email.kind} from ${c.sender.fromEmail}.`] : ["bad", "Email provider isn't configured."]);
    if (s.whatsapp.enabled) items.push(c.providers.whatsapp.kind === "mock" ? ["warn", "WhatsApp provider is MOCK: nothing will really be sent."] : c.providers.whatsapp.configured ? ["ok", "WhatsApp Cloud API configured."] : ["bad", "WhatsApp isn't configured."]);
    if (s.whatsapp.enabled && !c.providers.whatsapp.webhooks) items.push(["warn", "WhatsApp webhooks aren't set up: \"Not active on WhatsApp\" results and STOP replies can't be received."]);
    if (s.email.enabled && !c.unsubscribeLink) items.push(["warn", "No one-click unsubscribe link (set PUBLIC_BASE_URL and UNSUBSCRIBE_SECRET). Emails will ask people to reply UNSUBSCRIBE."]);
    items.push(["ok", `Throttling: email every ${c.delays.email[0] / 1000}–${c.delays.email[1] / 1000}s (max ${c.limits.emailPerHour}/h), WhatsApp every ${c.delays.whatsapp[0] / 1000}–${c.delays.whatsapp[1] / 1000}s (max ${c.limits.whatsappPerHour}/h).`]);
  }
  $("#liveChecklist").replaceChildren(...items.map(([cls, t]) => h("li", { class: cls }, t)));
  updateLiveBtn();
}
function updateLiveBtn() {
  const ok = state.preview && $("#lawfulBasis").checked && $("#confirmInput").value.trim().toUpperCase() === $("#confirmPhrase").textContent;
  $("#liveBtn").disabled = !ok;
}
$("#lawfulBasis").addEventListener("change", updateLiveBtn);
$("#confirmInput").addEventListener("input", updateLiveBtn);

async function startJob(mode) {
  showError($("#sendError"), "");
  if (!state.upload) return goto("upload");
  try {
    const r = await api("/api/jobs", {
      method: "POST",
      body: { uploadId: state.upload.uploadId, mapping: currentMapping(), defaultCountry: $("#countrySelect").value, settings: getSettings(), mode, confirm: $("#confirmInput").value },
    });
    state.jobId = r.jobId;
    $("#confirmInput").value = "";
    $("#lawfulBasis").checked = false;
    updateLiveBtn();
    goto("jobs");
  } catch (err) {
    showError($("#sendError"), err.message);
    if (mode === "dry") alert(err.message);
  }
}
$("#dryRunBtn").addEventListener("click", () => startJob("dry"));
$("#liveBtn").addEventListener("click", () => {
  if (confirm(`Send real messages to ${state.preview.summary.leads} leads now?`)) startJob("live");
});

// ---------- dashboard ----------
async function loadJobs() {
  const { jobs } = await api("/api/jobs");
  $("#jobEmpty").classList.toggle("hidden", jobs.length > 0);
  $("#jobView").classList.toggle("hidden", !jobs.length);
  if (!jobs.length) return;
  if (!state.jobId || !jobs.some((j) => j.id === state.jobId)) state.jobId = jobs[0].id;
  $("#jobSelect").replaceChildren(...jobs.map((j) => h("option", { value: j.id, selected: j.id === state.jobId }, `${new Date(j.createdAt).toLocaleString()} · ${j.mode === "live" ? "LIVE" : "dry run"} · ${j.sourceName} · ${j.status}`)));
  await openJob(state.jobId);
}
$("#jobSelect").addEventListener("change", (e) => openJob(e.target.value));

async function openJob(id) {
  state.jobId = id;
  state.job = await api(`/api/jobs/${id}`);
  $("#resultsLink").href = `/api/jobs/${id}/results.csv`;
  $("#reportLink").href = `/api/jobs/${id}/report.csv`;
  $("#jobSource").textContent = state.job.sourceName;
  renderJob();
  state.events?.close();
  state.events = new EventSource(`/api/jobs/${id}/events`);
  state.events.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (state.job?.id !== id) return;
    Object.assign(state.job, { status: d.status, pausedReason: d.pausedReason, counts: d.counts });
    if (d.lead) {
      const i = state.job.leads.findIndex((l) => l.id === d.lead.id);
      if (i >= 0) state.job.leads[i] = d.lead;
    }
    if (d.event) state.job.log.push({ at: new Date().toISOString(), ...d.event });
    scheduleRender();
  };
}
let renderPending = false;
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; renderJob(); });
}
function renderJob() {
  const j = state.job;
  if (!j) return;
  $("#jobMode").textContent = j.mode === "live" ? "LIVE" : "DRY RUN";
  $("#jobMode").className = `badge ${j.mode === "live" ? "s-failed" : "s-rendered"}`;
  $("#jobStatus").textContent = j.status;
  $("#jobStatus").className = `badge s-${j.status}`;
  $("#pausedReason").textContent = j.pausedReason || "";
  $("#pausedReason").classList.toggle("hidden", !(j.status === "paused" && j.pausedReason));
  $("#pauseBtn").disabled = j.status !== "running";
  $("#resumeBtn").disabled = !(j.status === "paused" || j.status === "ready");
  const retryable = j.leads.some((l) => l.emailState.status === "failed" || (l.whatsapp.status === "failed" && !l.whatsapp.notOnWhatsApp));
  $("#retryBtn").disabled = !retryable || j.status === "running";
  const opt = $("#jobSelect").selectedOptions[0];
  if (opt) opt.textContent = opt.textContent.replace(/· [a-z]+$/, `· ${j.status}`);
  const c = j.counts;
  $("#jobCounts").replaceChildren(
    stat("Sent", c.all.sent, "ok"), stat("Failed", c.all.failed, c.all.failed ? "bad" : ""), stat("Skipped", c.all.skipped),
    stat("Pending", c.all.pending, "info"), ...(j.mode === "dry" ? [stat("Rendered (dry run)", c.all.rendered, "warn")] : []),
    stat("In WhatsApp report", c.report, c.report ? "warn" : ""),
  );
  $("#channelBars").replaceChildren(...["email", "whatsapp"].map((ch) => {
    const k = c[ch];
    const total = Math.max(1, c.total);
    const seg = (n, color) => h("i", { style: `width:${(100 * n) / total}%;background:${color}` });
    return h("div", { class: "bar" },
      h("b", {}, ch === "email" ? "Email" : "WhatsApp"),
      h("div", { class: "track" }, seg(k.sent, "var(--ok)"), seg(k.rendered, "var(--warn)"), seg(k.failed, "var(--bad)"), seg(k.skipped, "var(--muted)")),
      h("span", { class: "muted small" }, `${k.sent} sent · ${k.failed} failed · ${k.skipped} skipped · ${k.pending} pending${k.rendered ? ` · ${k.rendered} rendered` : ""}`));
  }));
  renderLeadTable();
  $("#jobLog").replaceChildren(...j.log.slice(-200).reverse().map((e) => {
    const lead = e.leadId ? j.leads.find((l) => l.id === e.leadId) : null;
    return h("li", {}, `${new Date(e.at).toLocaleTimeString()} · ${e.type}${lead ? ` · line ${lead.line} ${lead.name || ""}` : ""}: ${e.message}`);
  }));
}
$("#leadFilter").addEventListener("change", renderLeadTable);
$("#leadSearch").addEventListener("input", renderLeadTable);
function renderLeadTable() {
  const j = state.job;
  const f = $("#leadFilter").value;
  const q = $("#leadSearch").value.trim().toLowerCase();
  const match = (l) => {
    const st = [l.emailState.status, l.whatsapp.status];
    if (f === "failed" && !st.includes("failed")) return false;
    if (f === "pending" && !st.some((s) => s === "pending" || s === "sending")) return false;
    if (f === "skipped" && !st.includes("skipped")) return false;
    if (f === "report" && !l.reportReason) return false;
    return !q || `${l.name} ${l.email}`.toLowerCase().includes(q);
  };
  const cell = (s) => h("td", {}, badge(s.status), s.reason || s.error ? h("span", { class: "issue warning" }, s.reason || s.error) : null, s.note ? h("span", { class: "issue" }, s.note) : null);
  $("#leadTable").replaceChildren(
    h("thead", {}, h("tr", {}, ...["Line", "Name", "Email", "Phone", "Email status", "WhatsApp status", "Report"].map((t) => h("th", {}, t)))),
    h("tbody", {}, ...j.leads.filter(match).map((l) =>
      h("tr", { class: "clickable", onclick: () => showLead(l.id) },
        h("td", {}, l.line), h("td", {}, l.name || "—"), h("td", {}, l.email || "—"), h("td", {}, l.phone || l.phoneRaw || "—"),
        cell(l.emailState), cell(l.whatsapp), h("td", {}, l.reportReason || "")))),
  );
}
async function showLead(leadId) {
  const d = await api(`/api/jobs/${state.jobId}/leads/${leadId}`);
  $("#leadDialogBody").replaceChildren(
    h("h3", {}, `Line ${d.line}: ${d.name || "(no name)"}`),
    h("p", { class: "muted" }, [d.email, d.phone || d.phoneRaw, d.socials].filter(Boolean).join(" · ")),
    h("div", { class: "preview" },
      h("div", { class: "label" }, `Email · ${d.emailState.status}${d.emailState.attempts ? ` · ${d.emailState.attempts} attempt(s)` : ""}`),
      d.emailPreview ? h("pre", {}, `Subject: ${d.emailPreview.subject}\n\n${d.emailPreview.text}`) : h("p", { class: "muted" }, d.emailState.reason || d.emailState.error || "Not rendered yet")),
    h("div", { class: "preview" },
      h("div", { class: "label" }, `WhatsApp · ${d.whatsapp.status}${d.whatsapp.attempts ? ` · ${d.whatsapp.attempts} attempt(s)` : ""}`),
      d.whatsappPreview ? h("pre", {}, d.whatsappPreview.text) : h("p", { class: "muted" }, d.whatsapp.reason || d.whatsapp.error || "Not rendered yet"),
      d.whatsapp.error && d.whatsappPreview ? h("p", { class: "error" }, d.whatsapp.error) : null),
  );
  $("#leadDialog").showModal();
}
$("#pauseBtn").addEventListener("click", () => api(`/api/jobs/${state.jobId}/pause`, { method: "POST" }).then(() => openJob(state.jobId)));
$("#resumeBtn").addEventListener("click", () => api(`/api/jobs/${state.jobId}/resume`, { method: "POST" }).catch((e) => alert(e.message)).then(() => openJob(state.jobId)));
$("#retryBtn").addEventListener("click", () => api(`/api/jobs/${state.jobId}/retry`, { method: "POST" }).catch((e) => alert(e.message)).then(() => openJob(state.jobId)));

// ---------- suppression ----------
async function loadSuppression(data) {
  const d = data || (await api("/api/suppression"));
  const list = (items, type) => items.length
    ? items.map((i) => h("li", {}, h("span", {}, i.value, h("span", { class: "muted small" }, ` · ${i.source}`)),
        h("button", { type: "button", onclick: async () => loadSuppression(await api("/api/suppression", { method: "DELETE", body: { type, value: i.value } })) }, "Remove")))
    : [h("li", { class: "muted" }, "Empty")];
  $("#suppressEmails").replaceChildren(...list(d.emails, "email"));
  $("#suppressPhones").replaceChildren(...list(d.phones, "phone"));
}
$("#suppressForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    loadSuppression(await api("/api/suppression", { method: "POST", body: { type: $("#suppressType").value, value: $("#suppressValue").value } }));
    $("#suppressValue").value = "";
  } catch (err) {
    alert(err.message);
  }
});

loadConfig().catch((err) => $("#providerStatus").replaceChildren(h("span", { class: "pill warn" }, `Could not load settings: ${err.message}`)));
