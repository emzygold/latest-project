// Builds the exact messages for one lead. Used by preview, test-send and real jobs alike,
// so what you preview is what gets sent.
import { render, validateTemplate, buildEmail, emailFooter, withWhatsAppOptOut, hasWhatsAppOptOut, leadValues } from "./template.js";
import { unsubscribeUrl } from "./suppression.js";

export const DEFAULT_SETTINGS = {
  email: {
    enabled: true,
    subject: "Quick idea for {{first_name|your business}}",
    body:
      "Hi {{first_name}},\n\n" +
      "I came across your work{{#socials}} ({{socials}}){{/socials}} and wanted to reach out.\n\n" +
      "I help businesses get a professional website that brings in customers. Would you be open to a quick chat this week?\n\n" +
      "Best regards,\nYour Name",
  },
  whatsapp: {
    enabled: true,
    mode: "template", // "template" (required for first contact) or "text" (only inside the 24-hour window)
    templateName: "",
    templateLanguage: "en",
    templateParams: ["{{first_name}}"],
    templateBody: "Hi {{1}}, this is Your Name. I sent you an email about a website for your business. Reply STOP to opt out.",
    text:
      "Hi {{first_name}}, this is Your Name. I just sent you an email about a website for your business{{#socials}} ({{socials}}){{/socials}}. " +
      "Can I share a quick idea here?",
  },
  ai: { enabled: false },
};

export function mergeSettings(s = {}) {
  return {
    email: { ...DEFAULT_SETTINGS.email, ...(s.email || {}) },
    whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...(s.whatsapp || {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) },
  };
}

/** Problems that block sending, and warnings worth showing. */
export function validateSettings(settings, { publicBaseUrl, unsubscribeSecret } = {}) {
  const errors = [];
  const warnings = [];
  const { email, whatsapp } = settings;
  if (!email.enabled && !whatsapp.enabled) errors.push("Turn on at least one channel.");
  if (email.enabled) {
    if (!email.subject.trim()) errors.push("Email subject is empty.");
    if (!email.body.trim()) errors.push("Email body is empty.");
    for (const p of validateTemplate(email.subject)) errors.push(`Email subject: ${p}`);
    for (const p of validateTemplate(email.body)) errors.push(`Email body: ${p}`);
    if (!publicBaseUrl || !unsubscribeSecret)
      warnings.push("No PUBLIC_BASE_URL/UNSUBSCRIBE_SECRET: emails will ask people to reply UNSUBSCRIBE instead of showing a one-click link.");
  }
  if (whatsapp.enabled) {
    if (whatsapp.mode === "template") {
      if (!whatsapp.templateName.trim()) errors.push("WhatsApp template name is empty (use the exact name of an approved template).");
      (whatsapp.templateParams || []).forEach((p, i) => {
        for (const prob of validateTemplate(p)) errors.push(`WhatsApp parameter {{${i + 1}}}: ${prob}`);
      });
      if (whatsapp.templateBody && !hasWhatsAppOptOut(whatsapp.templateBody))
        warnings.push("Your template text has no opt-out line. Add \"Reply STOP to opt out.\" to the template and get it re-approved.");
      const placeholders = new Set((whatsapp.templateBody || "").match(/\{\{\d+\}\}/g) || []);
      if (whatsapp.templateBody && placeholders.size !== (whatsapp.templateParams || []).length)
        warnings.push(`Template text has ${placeholders.size} placeholder(s) but ${whatsapp.templateParams.length} parameter(s) are set. They must match or Meta rejects the message.`);
    } else {
      if (!whatsapp.text.trim()) errors.push("WhatsApp message is empty.");
      for (const p of validateTemplate(whatsapp.text)) errors.push(`WhatsApp message: ${p}`);
      warnings.push("Free-text WhatsApp only works if the lead messaged you in the last 24 hours. For cold leads use an approved template.");
    }
  }
  return { errors, warnings };
}

export function composeEmail(lead, settings, ctx) {
  const subject = render(settings.email.subject, lead);
  const body = render(settings.email.body, lead);
  const unsub = unsubscribeUrl(ctx.publicBaseUrl, lead.email || "", ctx.unsubscribeSecret);
  const footer = emailFooter({ unsubscribeUrl: unsub, senderName: ctx.sender?.fromName, postalAddress: ctx.sender?.postalAddress });
  return { to: lead.email, subject, body, footer, unsubscribeUrl: unsub };
}

export function finalizeEmail(parts, body = parts.body) {
  return { to: parts.to, ...buildEmail({ subject: parts.subject, body, footer: parts.footer, unsubscribeUrl: parts.unsubscribeUrl }) };
}

export function composeWhatsApp(lead, settings) {
  const w = settings.whatsapp;
  if (w.mode === "template") {
    // Cloud API rejects empty parameters, so an empty value becomes a dash.
    const params = (w.templateParams || []).map((p) => render(p, lead) || "-");
    let preview = w.templateBody || `[Template "${w.templateName}"] parameters: ${params.join(" | ")}`;
    params.forEach((v, i) => (preview = preview.replaceAll(`{{${i + 1}}}`, v)));
    return { mode: "template", templateName: w.templateName, language: w.templateLanguage, params, preview };
  }
  const text = withWhatsAppOptOut(render(w.text, lead));
  return { mode: "text", text, preview: text };
}

/** Render everything for a lead without sending (dry-run preview). */
export function previewLead(lead, settings, ctx) {
  const out = { leadId: lead.id, values: leadValues(lead) };
  if (settings.email.enabled && lead.emailValid) {
    const e = finalizeEmail(composeEmail(lead, settings, ctx));
    out.email = { to: e.to, subject: e.subject, text: e.text };
  }
  if (settings.whatsapp.enabled && lead.phone) out.whatsapp = { to: lead.phone, ...composeWhatsApp(lead, settings) };
  return out;
}
