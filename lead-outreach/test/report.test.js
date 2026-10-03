import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "csv-parse/sync";
import { reportReason, buildReportRows, buildReportCsv, buildResultsCsv, REPORT_COLUMNS } from "../src/report.js";

const base = { name: "A", email: "a@example.com", emailRaw: "a@example.com", emailValid: true, phoneRaw: "", phone: "", socials: "", issues: [] };
const leads = [
  { ...base, name: "No Phone", phoneStatus: "missing" },
  { ...base, name: "Bad Phone", phoneRaw: "12345", phoneStatus: "invalid" },
  { ...base, name: "Not On WA", phoneRaw: "+1 202 555 0100", phone: "+12025550100", phoneStatus: "ok", socials: "@x", whatsapp: { status: "failed", notOnWhatsApp: true }, emailState: { status: "sent" } },
  { ...base, name: "Reachable", phoneRaw: "+1 202 555 0143", phone: "+12025550143", phoneStatus: "ok", whatsapp: { status: "delivered" }, emailState: { status: "sent" } },
  { ...base, name: "Other WA failure", phoneRaw: "+1 202 555 0150", phone: "+12025550150", phoneStatus: "ok", whatsapp: { status: "failed", error: "rate limit" } },
];

test("reportReason uses the three exact reasons and nothing else", () => {
  assert.equal(reportReason(leads[0]), "No phone number");
  assert.equal(reportReason(leads[1]), "Invalid number format");
  assert.equal(reportReason(leads[2]), "Not active on WhatsApp");
  assert.equal(reportReason(leads[3]), null);
  assert.equal(reportReason(leads[4]), null, "a temporary failure is not 'not on WhatsApp'");
});

test("report rows have the required columns and the email follow-up status", () => {
  const rows = buildReportRows(leads);
  assert.equal(rows.length, 3);
  assert.deepEqual(Object.keys(rows[0]), REPORT_COLUMNS);
  assert.deepEqual(REPORT_COLUMNS, ["Name", "Email", "Phone Number", "Socials", "Reason", "Email Status"]);
  assert.equal(rows[0]["Email Status"], "Not sent yet");
  assert.equal(rows[2]["Email Status"], "Sent");
  assert.equal(rows[1]["Phone Number"], "12345", "the original number is shown");
});

test("email status labels cover dry runs, skips, failures and bad addresses", () => {
  const label = (l) => buildReportRows([{ ...base, phoneStatus: "missing", ...l }])[0]["Email Status"];
  assert.equal(label({ emailState: { status: "rendered" } }), "Not sent (dry run)");
  assert.equal(label({ emailState: { status: "skipped", reason: "Unsubscribed (suppression list)" } }), "Skipped: Unsubscribed (suppression list)");
  assert.equal(label({ emailState: { status: "failed", error: "SMTP error 550" } }), "Failed: SMTP error 550");
  assert.equal(label({ emailRaw: "", email: "" }), "No email address");
  assert.equal(label({ emailValid: false, email: "", emailRaw: "bad@" }), "Invalid email");
});

test("report CSV parses back to the same rows in file order", () => {
  const csv = buildReportCsv(leads);
  const parsed = parse(csv, { bom: true, columns: true });
  assert.deepEqual(parsed.map((r) => r.Name), ["No Phone", "Bad Phone", "Not On WA"]);
  assert.deepEqual(parsed.map((r) => r.Reason), ["No phone number", "Invalid number format", "Not active on WhatsApp"]);
  assert.equal(parsed[2].Socials, "@x");
});

test("an empty report still has its header row", () => {
  const csv = buildReportCsv([leads[3]]);
  assert.equal(csv.charCodeAt(0), 0xfeff, "starts with a BOM so Excel reads UTF-8");
  assert.equal(csv.slice(1).trim(), REPORT_COLUMNS.join(","));
});

test("results CSV lists every lead with both channel statuses", () => {
  const withStates = leads.map((l, i) => ({ line: i + 2, emailState: { status: "pending" }, whatsapp: { status: "skipped" }, ...l }));
  const parsed = parse(buildResultsCsv(withStates), { bom: true, columns: true });
  assert.equal(parsed.length, leads.length);
  assert.equal(parsed[2]["Report Reason"], "Not active on WhatsApp");
  assert.equal(parsed[3]["WhatsApp Status"], "delivered");
});
