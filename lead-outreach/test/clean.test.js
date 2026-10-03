import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, normalizeEmail, resolveCountry, cleanLeads, REPORT_REASONS } from "../src/clean.js";
import { parseCsv, mapHeaders } from "../src/csv.js";

test("normalises Nigerian numbers in every common format to E.164", () => {
  for (const raw of ["08031234567", "0803 123 4567", "0803-123-4567", "+234 803 123 4567", "2348031234567", "002348031234567", "+234(0)8031234567", "tel:+2348031234567"]) {
    const r = normalizePhone(raw, "NG");
    assert.equal(r.ok, true, raw);
    assert.equal(r.e164, "+2348031234567", raw);
  }
});

test("uses the default country only when the number has no country code", () => {
  assert.equal(normalizePhone("(202) 555-0143", "US").e164, "+12025550143");
  assert.equal(normalizePhone("+44 7911 123456", "NG").e164, "+447911123456");
  assert.equal(normalizePhone("07911 123456", "GB").e164, "+447911123456");
});

test("accepts the default country as an ISO code or a calling code", () => {
  assert.equal(resolveCountry("ng"), "NG");
  assert.equal(resolveCountry("+234"), "NG");
  assert.equal(resolveCountry("234"), "NG");
  assert.equal(resolveCountry("1"), "US");
  assert.equal(resolveCountry("44"), "GB");
  assert.equal(resolveCountry("ZZ"), null);
  assert.equal(normalizePhone("08031234567", "+234").e164, "+2348031234567");
});

test("reports missing and invalid phone numbers with the exact report reasons", () => {
  assert.deepEqual(normalizePhone("", "NG"), { ok: false, e164: "", reason: REPORT_REASONS.NO_PHONE });
  assert.equal(normalizePhone("   ", "NG").reason, "No phone number");
  for (const bad of ["12345", "abc", "0803123", "+999 123 456 789", "080312345678901"])
    assert.equal(normalizePhone(bad, "NG").reason, "Invalid number format", bad);
});

test("validates and tidies email addresses", () => {
  assert.deepEqual(normalizeEmail("  Ada@Example.COM "), { ok: true, value: "Ada@example.com" });
  assert.equal(normalizeEmail("mailto:a@b.co").value, "a@b.co");
  for (const bad of ["a@b", "a b@c.com", "a@@b.com", "a@b..com", "@b.com", "a@.com", "plainaddress"])
    assert.equal(normalizeEmail(bad).ok, false, bad);
  assert.equal(normalizeEmail("").reason, "missing");
});

test("cleanLeads trims, flags duplicates per channel and keeps original values", () => {
  const csv = [
    "Name,Email,Phone Number,Socials",
    "  Ada   Okafor ,ADA@example.com, 0803 123 4567 ,@ada",
    "Ada Again,ada@EXAMPLE.com,08039999999,",
    "Kemi,kemi@example.com,+2348031234567,",
    ",,,",
    "Dr. John Doe,john@example,,x.com/john",
  ].join("\n");
  const { headers, rows } = parseCsv(csv);
  const { leads, summary } = cleanLeads(rows, mapHeaders(headers).mapping, { defaultCountry: "NG" });

  assert.equal(summary.blankRows, 1);
  assert.equal(leads.length, 4);
  assert.equal(leads[0].name, "Ada Okafor");
  assert.equal(leads[0].firstName, "Ada");
  assert.equal(leads[0].phone, "+2348031234567");
  assert.equal(leads[0].phoneRaw, "0803 123 4567");

  assert.equal(leads[1].duplicateEmailOf, 2, "same email, different case");
  assert.equal(leads[1].duplicatePhoneOf, null);
  assert.equal(leads[2].duplicatePhoneOf, 2, "same number in a different format");
  assert.equal(leads[2].duplicateEmailOf, null);

  const john = leads[3];
  assert.equal(john.firstName, "John", "titles are skipped for first names");
  assert.equal(john.emailValid, false);
  assert.equal(john.phoneStatus, "missing");
  assert.ok(john.issues.some((i) => i.level === "error" && /Invalid email/.test(i.message)));
  assert.equal(summary.duplicateEmails, 1);
  assert.equal(summary.duplicatePhones, 1);
});

test("cleanLeads combines first and last name columns", () => {
  const { headers, rows } = parseCsv("First Name,Last Name,Email\nAda,Okafor,a@example.com\n");
  const { leads } = cleanLeads(rows, mapHeaders(headers).mapping, { defaultCountry: "NG" });
  assert.equal(leads[0].name, "Ada Okafor");
  assert.equal(leads[0].phoneStatus, "missing");
});
