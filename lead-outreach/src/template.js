// Merge-field templates with graceful fallbacks.
//
//   {{name}}                 the lead's value, or the field's default fallback
//   {{name|friend}}          custom fallback when the value is empty
//   {{#socials}}...{{/socials}}   block shown only when socials is not empty
//   {{^socials}}...{{/socials}}   block shown only when socials is empty
//
// Lines that end up empty because a placeholder had no value are removed, so a
// message never shows "Hi ," or a dangling blank label.

export const MERGE_FIELDS = {
  name: { label: "Full name", fallback: "there" },
  first_name: { label: "First name", fallback: "there" },
  email: { label: "Email", fallback: "" },
  phone: { label: "Phone (international)", fallback: "" },
  socials: { label: "Socials", fallback: "" },
};

const ALIAS = { firstname: "first_name", "first name": "first_name", fullname: "name", full_name: "name",
  phone_number: "phone", "phone number": "phone", social: "socials" };

const canon = (f) => {
  const k = String(f).trim().toLowerCase();
  return ALIAS[k] || k;
};

export function leadValues(lead) {
  return {
    name: lead.name || "",
    first_name: lead.firstName || "",
    email: lead.email || "",
    phone: lead.phone || "",
    socials: lead.socials || "",
  };
}

/** Returns a list of problems (unknown fields, unbalanced blocks). Empty list = valid. */
export function validateTemplate(tpl) {
  const problems = [];
  const text = String(tpl ?? "");
  const stack = [];
  for (const m of text.matchAll(/\{\{\s*([#^/]?)\s*([^}|]+?)\s*(?:\|[^}]*)?\}\}/g)) {
    const [, kind, raw] = m;
    const field = canon(raw);
    if (!(field in MERGE_FIELDS)) problems.push(`Unknown merge field {{${raw.trim()}}}`);
    if (kind === "#" || kind === "^") stack.push(field);
    else if (kind === "/") {
      if (stack.pop() !== field) problems.push(`Block {{/${raw.trim()}}} closes nothing or the wrong block`);
    }
  }
  if (stack.length) problems.push(`Unclosed block {{#${stack[stack.length - 1]}}}`);
  if (/\{\{(?![^}]*\}\})/.test(text)) problems.push("A {{ has no matching }}");
  return [...new Set(problems)];
}

/** Render a template for one lead (or a ready {name, first_name, ...} map). Values are inserted as plain text. */
export function render(tpl, lead) {
  const values = "first_name" in lead ? lead : leadValues(lead);
  const has = (f) => String(values[canon(f)] ?? "").trim() !== "";
  let text = String(tpl ?? "");

  // Sections, innermost first so nesting works.
  const block = /\{\{\s*([#^])\s*([\w ]+?)\s*\}\}((?:(?!\{\{\s*[#^])[\s\S])*?)\{\{\s*\/\s*\2\s*\}\}/;
  for (let guard = 0; guard < 100 && block.test(text); guard++) {
    text = text.replace(block, (_, kind, f, inner) => ((kind === "#") === has(f) ? inner : ""));
  }

  // Track which lines held a placeholder that rendered empty, to drop them afterwards.
  const EMPTY = "\u0000";
  text = text.replace(/\{\{\s*([^}|#^/]+?)\s*(?:\|([^}]*))?\}\}/g, (_, f, custom) => {
    const field = canon(f);
    const value = String(values[field] ?? "").trim();
    if (value) return value;
    const fallback = custom !== undefined ? custom.trim() : MERGE_FIELDS[field]?.fallback ?? "";
    return fallback || EMPTY;
  });

  const lines = text.split("\n").filter((line) => {
    if (!line.includes(EMPTY)) return true;
    // Keep the line if it still has real words once the empty value is removed,
    // but drop a "label:" line whose only content was the missing value.
    const rest = line.replaceAll(EMPTY, "").trim();
    return rest !== "" && !/^[^\w]*[\w ]{0,20}[:\-–]\s*$/.test(rest);
  });
  return lines
    .join("\n")
    .replaceAll(EMPTY, "")
    .replace(/[ \t]+([,.!?;:])/g, "$1") // "Hi ," -> "Hi,"
    .replace(/([,;:])(?=[,.!?;:])/g, "") // ",." -> "."
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- opt-out lines ----------

export function emailFooter({ unsubscribeUrl, senderName, postalAddress }) {
  const lines = ["—"];
  lines.push(
    unsubscribeUrl
      ? `Don't want to hear from ${senderName || "us"}? Unsubscribe here: ${unsubscribeUrl}`
      : `Don't want to hear from ${senderName || "us"}? Reply with "UNSUBSCRIBE" and we won't email you again.`,
  );
  if (postalAddress) lines.push(postalAddress);
  return lines.join("\n");
}

export const WHATSAPP_OPT_OUT = "Reply STOP to opt out.";

/** True if a WhatsApp text already tells the reader how to opt out. */
export function hasWhatsAppOptOut(text) {
  return /\bstop\b|opt[\s-]?out|unsubscribe/i.test(String(text ?? ""));
}

export function withWhatsAppOptOut(text) {
  return hasWhatsAppOptOut(text) ? text : `${String(text).trim()}\n\n${WHATSAPP_OPT_OUT}`;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Build the final email: plain text + simple HTML, with a footer the user cannot remove. */
export function buildEmail({ subject, body, footer, unsubscribeUrl }) {
  const text = `${body.trim()}\n\n${footer}`;
  const linkify = (s) =>
    escapeHtml(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${linkify(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  const footerHtml = `<p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">${linkify(
    footer.replace(/^—\n/, ""),
  ).replace(/\n/g, "<br>")}</p>`;
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111827">\n${paragraphs}\n${footerHtml}\n</body></html>`;
  return { subject: subject.replace(/\s+/g, " ").trim(), text, html, unsubscribeUrl };
}
