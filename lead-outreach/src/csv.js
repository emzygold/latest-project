// CSV parsing and case-insensitive header mapping.
// The uploaded file is only ever read from memory; it is never modified or written back.
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export const FIELDS = ["name", "email", "phone", "socials"];

// Known header spellings for each field, already normalised (see normalizeHeader).
const ALIASES = {
  name: ["name", "full name", "fullname", "lead name", "contact name", "contact", "client name", "customer name"],
  first_name: ["first name", "firstname", "given name", "fname"],
  last_name: ["last name", "lastname", "surname", "family name", "lname"],
  email: ["email", "e mail", "email address", "e mail address", "mail", "email id"],
  phone: [
    "phone", "phone number", "phonenumber", "phone no", "mobile", "mobile number", "mobile no", "cell",
    "cell phone", "telephone", "tel", "whatsapp", "whatsapp number", "whatsapp no", "contact number", "number",
  ],
  socials: [
    "socials", "social", "social media", "social links", "social handle", "social handles", "socials links",
    "instagram", "twitter", "x", "linkedin", "facebook", "tiktok", "handle", "handles", "links", "profile", "website",
  ],
};

export function normalizeHeader(h) {
  return String(h ?? "")
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[_\-.:/()#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse CSV text or a Buffer into { headers, rows } (rows are arrays of strings). */
export function parseCsv(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input ?? "");
  if (!text.trim()) throw new Error("The file is empty.");
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0];
  const delimiter = [",", ";", "\t", "|"]
    .map((d) => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  let records;
  try {
    records = parse(text, {
      bom: true,
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: false,
    });
  } catch (err) {
    throw new Error(`Could not read the CSV: ${err.message}`);
  }
  if (!records.length) throw new Error("The file has no rows.");
  const headers = records[0].map((h) => String(h ?? "").replace(/^﻿/, "").trim());
  // Keep the file's own line numbers: data row i sits on line i + 2.
  const rows = records.slice(1).map((cells, i) => ({ line: i + 2, cells }));
  return { headers, rows, delimiter };
}

/**
 * Map headers to fields case-insensitively. Exact alias matches win over partial ones,
 * and each column is used once. Returns column indexes (or -1).
 */
export function mapHeaders(headers) {
  const norm = headers.map(normalizeHeader);
  const used = new Set();
  const mapping = {};
  const pick = (field, partial) => {
    const aliases = ALIASES[field];
    for (const alias of aliases) {
      // Partial matches work on whole words, so "x" never matches "tax id".
      const idx = norm.findIndex(
        (h, i) => !used.has(i) && (partial ? ` ${h} `.includes(` ${alias} `) : h === alias),
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };
  for (const field of ["email", "phone", "first_name", "last_name", "name", "socials"]) {
    let idx = pick(field, false);
    if (idx === -1 && field !== "socials" && field !== "first_name" && field !== "last_name") idx = pick(field, true);
    if (idx === -1 && field === "socials") idx = pick(field, true);
    mapping[field] = idx;
    if (idx !== -1) used.add(idx);
  }
  const warnings = [];
  if (mapping.email === -1 && mapping.phone === -1)
    warnings.push("No email or phone column found. Map at least one before sending.");
  else {
    if (mapping.email === -1) warnings.push("No email column found: no emails will be sent.");
    if (mapping.phone === -1) warnings.push("No phone column found: every lead will be listed in the WhatsApp report.");
  }
  if (mapping.name === -1 && mapping.first_name === -1)
    warnings.push("No name column found: messages will use the fallback greeting.");
  if (mapping.socials === -1) warnings.push("No Socials column found (optional): {{socials}} will use its fallback.");
  const unmapped = headers.filter((_, i) => !used.has(i));
  return { mapping, warnings, unmapped };
}

/** Apply a user-supplied mapping override ({field: headerName|index|""}) on top of auto-detection. */
export function resolveMapping(headers, override = {}) {
  const auto = mapHeaders(headers);
  const mapping = { ...auto.mapping };
  for (const [field, value] of Object.entries(override || {})) {
    if (!(field in mapping)) continue;
    if (value === "" || value === null || value === -1) mapping[field] = -1;
    else if (Number.isInteger(value)) mapping[field] = value >= 0 && value < headers.length ? value : -1;
    else {
      const idx = headers.findIndex((h) => normalizeHeader(h) === normalizeHeader(value));
      mapping[field] = idx;
    }
  }
  return mapping;
}

/**
 * Spreadsheet apps can run cells starting with = + - @ as formulas. Neutralise anything
 * formula-like, but leave phone numbers (+1 (202) 555...) and handles (@name) readable.
 */
export function safeCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/^[=\t\r]/.test(s)) return `'${s}`;
  if (/^[+\-@]/.test(s) && !/^\+?[\d\s().-]+$/.test(s) && !/^@[\w.]+$/.test(s)) return `'${s}`;
  return s;
}

export function toCsv(columns, rows) {
  return stringify([columns, ...rows.map((r) => columns.map((c) => safeCell(r[c])))], { bom: true });
}
