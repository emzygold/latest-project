import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, mapHeaders, resolveMapping, normalizeHeader, safeCell, toCsv } from "../src/csv.js";

test("normalizeHeader handles case, underscores, punctuation and BOM", () => {
  assert.equal(normalizeHeader("﻿Phone_Number"), "phone number");
  assert.equal(normalizeHeader("  E-mail  "), "e mail");
  assert.equal(normalizeHeader("WhatsApp No."), "whatsapp no");
});

test("maps common header spellings case-insensitively", () => {
  const cases = [
    [["Name", "Email", "Phone Number", "Socials"], { name: 0, email: 1, phone: 2, socials: 3 }],
    [["NAME", "EMAIL", "PHONE", "SOCIALS"], { name: 0, email: 1, phone: 2, socials: 3 }],
    [["full_name", "email_address", "phone_number", "social_media"], { name: 0, email: 1, phone: 2, socials: 3 }],
    [["Contact Name", "E-mail", "Mobile", "Instagram"], { name: 0, email: 1, phone: 2, socials: 3 }],
    [["phone", "name", "mail"], { name: 1, email: 2, phone: 0, socials: -1 }],
    [["WhatsApp Number", "Email ID", "Lead Name"], { name: 2, email: 1, phone: 0, socials: -1 }],
  ];
  for (const [headers, expected] of cases) {
    const { mapping } = mapHeaders(headers);
    for (const [field, idx] of Object.entries(expected)) assert.equal(mapping[field], idx, `${headers.join(",")} -> ${field}`);
  }
});

test("supports separate first and last name columns", () => {
  const { mapping } = mapHeaders(["First Name", "Last Name", "Email", "Phone"]);
  assert.equal(mapping.first_name, 0);
  assert.equal(mapping.last_name, 1);
  assert.equal(mapping.name, -1);
});

test("a missing Socials column is tolerated with only a warning", () => {
  const { mapping, warnings } = mapHeaders(["Name", "Email", "Phone Number"]);
  assert.equal(mapping.socials, -1);
  assert.ok(warnings.some((w) => /Socials/.test(w)));
  assert.ok(!warnings.some((w) => /No email or phone/.test(w)));
});

test("warns when neither email nor phone is present", () => {
  const { warnings } = mapHeaders(["Name", "Company"]);
  assert.ok(warnings.some((w) => /No email or phone column/.test(w)));
});

test("partial matching uses whole words only", () => {
  // "tax id" contains the letter x but must not be taken as the X/Twitter socials column.
  const { mapping } = mapHeaders(["Name", "Email", "Phone", "Tax ID"]);
  assert.equal(mapping.socials, -1);
});

test("parseCsv keeps file line numbers, quoted commas, BOM and blank rows", () => {
  const csv = '﻿Name,Email,Phone Number,Socials\r\n"Okafor, Ada",ada@example.com,+12025550143,@ada\r\n\r\nTunde,t@example.com,,\r\n';
  const { headers, rows } = parseCsv(Buffer.from(csv));
  assert.deepEqual(headers, ["Name", "Email", "Phone Number", "Socials"]);
  assert.equal(rows[0].line, 2);
  assert.equal(rows[0].cells[0], "Okafor, Ada");
  assert.equal(rows[2].line, 4);
  assert.equal(rows[2].cells[0], "Tunde");
});

test("parseCsv detects semicolon and tab delimiters", () => {
  assert.deepEqual(parseCsv("Name;Email\nAda;a@example.com\n").rows[0].cells, ["Ada", "a@example.com"]);
  assert.deepEqual(parseCsv("Name\tEmail\nAda\ta@example.com\n").rows[0].cells, ["Ada", "a@example.com"]);
});

test("parseCsv tolerates rows with missing trailing cells", () => {
  const { rows } = parseCsv("Name,Email,Phone,Socials\nAda,a@example.com\n");
  assert.deepEqual(rows[0].cells, ["Ada", "a@example.com"]);
});

test("parseCsv rejects an empty file", () => {
  assert.throws(() => parseCsv(""), /empty/);
});

test("resolveMapping applies user overrides by header name or index", () => {
  const headers = ["Who", "Address", "Cell", "IG"];
  const m = resolveMapping(headers, { name: "who", email: 1, phone: "CELL", socials: "" });
  assert.equal(m.name, 0);
  assert.equal(m.email, 1);
  assert.equal(m.phone, 2);
  assert.equal(m.socials, -1);
});

test("safeCell neutralises formulas but keeps phones and handles readable", () => {
  assert.equal(safeCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(safeCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(safeCell("+1 (202) 555-0143"), "+1 (202) 555-0143");
  assert.equal(safeCell("@adabakes"), "@adabakes");
  assert.equal(safeCell(null), "");
});

test("toCsv writes a BOM, header row and quoted values", () => {
  const out = toCsv(["A", "B"], [{ A: "x, y", B: 'say "hi"' }]);
  assert.ok(out.startsWith("﻿A,B\n"));
  assert.ok(out.includes('"x, y","say ""hi"""'));
});
