// Report CSV: every lead that could not be reached on WhatsApp, with its email status
// so it can still be followed up by email.
import { toCsv } from "./csv.js";
import { REPORT_REASONS } from "./clean.js";

export const REPORT_COLUMNS = ["Name", "Email", "Phone Number", "Socials", "Reason", "Email Status"];

const EMAIL_STATUS_LABEL = {
  pending: "Pending",
  sending: "Pending",
  sent: "Sent",
  failed: "Failed",
  rendered: "Not sent (dry run)",
  skipped: "Skipped",
};

/** The WhatsApp report reason for a lead, or null if the lead is reachable (or not yet known). */
export function reportReason(lead) {
  if (lead.phoneStatus === "missing") return REPORT_REASONS.NO_PHONE;
  if (lead.phoneStatus === "invalid") return REPORT_REASONS.INVALID_PHONE;
  if (lead.whatsapp?.notOnWhatsApp) return REPORT_REASONS.NOT_ON_WHATSAPP;
  return null;
}

export function emailStatusLabel(lead) {
  const e = lead.emailState;
  if (!e) {
    if (!lead.emailRaw) return "No email address";
    if (!lead.emailValid) return "Invalid email";
    return "Not sent yet";
  }
  let label = EMAIL_STATUS_LABEL[e.status] || e.status;
  if (e.status === "skipped" && e.reason) label = `Skipped: ${e.reason}`;
  if (e.status === "failed" && e.error) label = `Failed: ${e.error}`;
  return label;
}

/** Rows for the report, in the original file order. */
export function buildReportRows(leads) {
  return leads
    .map((lead) => ({ lead, reason: reportReason(lead) }))
    .filter((r) => r.reason)
    .map(({ lead, reason }) => ({
      Name: lead.name,
      Email: lead.email || lead.emailRaw,
      "Phone Number": lead.phoneRaw,
      Socials: lead.socials,
      Reason: reason,
      "Email Status": emailStatusLabel(lead),
    }));
}

export function buildReportCsv(leads) {
  return toCsv(REPORT_COLUMNS, buildReportRows(leads));
}

export const RESULT_COLUMNS = [
  "Line", "Name", "Email", "Phone Number", "Phone (international)", "Socials",
  "Email Status", "Email Detail", "Email Attempts", "Email Sent At",
  "WhatsApp Status", "WhatsApp Detail", "WhatsApp Attempts", "WhatsApp Sent At",
  "Report Reason", "Notes",
];

/** Full results for every lead in a job. */
export function buildResultsCsv(leads) {
  const rows = leads.map((l) => {
    const e = l.emailState || {};
    const w = l.whatsapp || {};
    return {
      Line: l.line,
      Name: l.name,
      Email: l.email || l.emailRaw,
      "Phone Number": l.phoneRaw,
      "Phone (international)": l.phone,
      Socials: l.socials,
      "Email Status": e.status || "",
      "Email Detail": e.error || e.reason || "",
      "Email Attempts": e.attempts || 0,
      "Email Sent At": e.sentAt || "",
      "WhatsApp Status": w.status || "",
      "WhatsApp Detail": w.error || w.reason || "",
      "WhatsApp Attempts": w.attempts || 0,
      "WhatsApp Sent At": w.sentAt || "",
      "Report Reason": reportReason(l) || "",
      Notes: l.issues.map((i) => i.message).join("; "),
    };
  });
  return toCsv(RESULT_COLUMNS, rows);
}
