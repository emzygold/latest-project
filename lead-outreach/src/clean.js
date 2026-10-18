// Data cleaning: trimming, email validation, phone normalisation and duplicate flags.
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from "libphonenumber-js/max";

export const REPORT_REASONS = {
  NO_PHONE: "No phone number",
  INVALID_PHONE: "Invalid number format",
  NOT_ON_WHATSAPP: "Not active on WhatsApp",
};

const tidy = (v) =>
  String(v ?? "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Practical email check: one @, no spaces, a dotted domain with a 2+ letter TLD.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function normalizeEmail(raw) {
  const email = tidy(raw).replace(/^mailto:/i, "");
  if (!email) return { ok: false, value: "", reason: "missing" };
  if (email.length > 254 || !EMAIL_RE.test(email) || email.includes(".."))
    return { ok: false, value: email, reason: "invalid" };
  const [local, domain] = email.split("@");
  return { ok: true, value: `${local}@${domain.toLowerCase()}` };
}

/**
 * Accept an ISO country ("NG"), a calling code ("234", "+234") or a country name we know.
 * Returns an ISO 3166 alpha-2 code supported by libphonenumber, or null.
 */
export function resolveCountry(input) {
  const s = String(input ?? "").trim();
  if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s) && isSupportedCountry(s.toUpperCase())) return s.toUpperCase();
  const digits = s.replace(/[^\d]/g, "");
  if (digits && /^\+?\d{1,4}$/.test(s.replace(/\s/g, ""))) {
    if (digits === "1") return "US";
    if (digits === "44") return "GB";
    if (digits === "7") return "RU";
    return getCountries().find((c) => getCountryCallingCode(c) === digits) || null;
  }
  return null;
}

/**
 * Normalise to E.164 (+2348012345678). Numbers without a country code use defaultCountry.
 * A local leading 0 is handled by libphonenumber (0801... in NG -> +234801...).
 */
export function normalizePhone(raw, defaultCountry) {
  const original = tidy(raw);
  if (!original) return { ok: false, e164: "", reason: REPORT_REASONS.NO_PHONE };
  let s = original.replace(/^(tel:|whatsapp:)/i, "").replace(/(ext\.?|x)\s*\d+$/i, "").trim();
  s = s.replace(/^00/, "+");
  // Strip everything except digits and a leading +.
  const cleaned = (s.startsWith("+") ? "+" : "") + s.replace(/[^\d]/g, "");
  if (cleaned.replace("+", "").length < 6) return { ok: false, e164: "", reason: REPORT_REASONS.INVALID_PHONE };
  const country = resolveCountry(defaultCountry) || undefined;
  let parsed = parsePhoneNumberFromString(cleaned, country);
  // A number written as country code without "+" (e.g. 2348012345678).
  if ((!parsed || !parsed.isValid()) && !cleaned.startsWith("+")) {
    const intl = parsePhoneNumberFromString(`+${cleaned}`);
    if (intl && intl.isValid()) parsed = intl;
  }
  if (!parsed || !parsed.isValid()) return { ok: false, e164: "", reason: REPORT_REASONS.INVALID_PHONE };
  return { ok: true, e164: parsed.number, country: parsed.country, type: parsed.getType() };
}

function firstNameOf(name) {
  const first = tidy(name).split(" ")[0] || "";
  // Avoid using titles like "Dr." or "Mr" as a first name.
  if (/^(mr|mrs|ms|miss|dr|prof|engr|chief|sir)\.?$/i.test(first)) return tidy(name).split(" ")[1] || "";
  return first;
}

/**
 * Turn parsed rows into clean lead records.
 * mapping: column indexes for name/first_name/last_name/email/phone/socials (-1 = missing).
 */
export function cleanLeads(rows, mapping, { defaultCountry } = {}) {
  const cell = (cells, idx) => (idx >= 0 ? tidy(cells[idx]) : "");
  const seenEmail = new Map();
  const seenPhone = new Map();
  const leads = [];
  let blank = 0;

  for (const { line, cells } of rows) {
    if (!cells.some((c) => tidy(c))) {
      blank++;
      continue;
    }
    let name = cell(cells, mapping.name);
    if (!name) name = tidy(`${cell(cells, mapping.first_name)} ${cell(cells, mapping.last_name)}`);
    const emailRaw = cell(cells, mapping.email);
    const phoneRaw = cell(cells, mapping.phone);
    const socials = cell(cells, mapping.socials);

    const issues = [];
    const email = normalizeEmail(emailRaw);
    if (!email.ok) issues.push({ level: email.reason === "missing" ? "warning" : "error", field: "email",
      message: email.reason === "missing" ? "No email address" : `Invalid email "${emailRaw}"` });

    const phone = normalizePhone(phoneRaw, defaultCountry);
    if (!phone.ok) issues.push({ level: phone.reason === REPORT_REASONS.NO_PHONE ? "warning" : "error", field: "phone",
      message: phone.reason === REPORT_REASONS.NO_PHONE ? "No phone number" : `Invalid phone "${phoneRaw}"` });

    if (phone.ok && phone.type === "FIXED_LINE")
      issues.push({ level: "warning", field: "phone", message: "Looks like a landline: it may not be on WhatsApp" });
    if (!name) issues.push({ level: "warning", field: "name", message: "No name: the fallback greeting will be used" });

    const lead = {
      id: leads.length + 1,
      line,
      name,
      firstName: firstNameOf(name),
      email: email.ok ? email.value : "",
      emailRaw,
      emailValid: email.ok,
      phoneRaw,
      phone: phone.ok ? phone.e164 : "",
      phoneStatus: phone.ok ? "ok" : phone.reason === REPORT_REASONS.NO_PHONE ? "missing" : "invalid",
      phoneReason: phone.ok ? "" : phone.reason,
      socials,
      duplicateEmailOf: null,
      duplicatePhoneOf: null,
      issues,
    };

    if (lead.emailValid) {
      const key = lead.email.toLowerCase();
      if (seenEmail.has(key)) {
        lead.duplicateEmailOf = seenEmail.get(key);
        issues.push({ level: "warning", field: "email", message: `Duplicate email (same as line ${lead.duplicateEmailOf}): email skipped` });
      } else seenEmail.set(key, line);
    }
    if (lead.phone) {
      if (seenPhone.has(lead.phone)) {
        lead.duplicatePhoneOf = seenPhone.get(lead.phone);
        issues.push({ level: "warning", field: "phone", message: `Duplicate phone (same as line ${lead.duplicatePhoneOf}): WhatsApp skipped` });
      } else seenPhone.set(lead.phone, line);
    }
    leads.push(lead);
  }

  const summary = {
    rows: rows.length,
    blankRows: blank,
    leads: leads.length,
    validEmails: leads.filter((l) => l.emailValid && !l.duplicateEmailOf).length,
    invalidEmails: leads.filter((l) => l.emailRaw && !l.emailValid).length,
    missingEmails: leads.filter((l) => !l.emailRaw).length,
    validPhones: leads.filter((l) => l.phoneStatus === "ok" && !l.duplicatePhoneOf).length,
    invalidPhones: leads.filter((l) => l.phoneStatus === "invalid").length,
    missingPhones: leads.filter((l) => l.phoneStatus === "missing").length,
    duplicateEmails: leads.filter((l) => l.duplicateEmailOf).length,
    duplicatePhones: leads.filter((l) => l.duplicatePhoneOf).length,
    errors: leads.reduce((n, l) => n + l.issues.filter((i) => i.level === "error").length, 0),
    warnings: leads.reduce((n, l) => n + l.issues.filter((i) => i.level === "warning").length, 0),
  };
  return { leads, summary };
}
