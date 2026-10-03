import { test } from "node:test";
import assert from "node:assert/strict";
import { render, validateTemplate, withWhatsAppOptOut, hasWhatsAppOptOut, emailFooter, buildEmail } from "../src/template.js";
import { mergeSettings, composeWhatsApp, validateSettings, previewLead } from "../src/messages.js";

const full = { id: 1, name: "Ada Okafor", firstName: "Ada", email: "ada@example.com", phone: "+2348031234567", socials: "@adabakes" };
const empty = { id: 2, name: "", firstName: "", email: "x@example.com", phone: "", socials: "" };

test("fills merge fields from the lead", () => {
  assert.equal(render("Hi {{first_name}} ({{name}}), saw {{socials}}", full), "Hi Ada (Ada Okafor), saw @adabakes");
});

test("merge fields are case- and space-insensitive with aliases", () => {
  assert.equal(render("{{ Name }} / {{FIRST_NAME}} / {{first name}}", full), "Ada Okafor / Ada / Ada");
});

test("empty fields fall back gracefully instead of leaving blanks", () => {
  assert.equal(render("Hi {{first_name}},", empty), "Hi there,");
  assert.equal(render("Hi {{name|friend}}!", empty), "Hi friend!");
  assert.equal(render("Loved {{socials|your page}}.", empty), "Loved your page.");
});

test("conditional blocks show only when the field has a value", () => {
  const tpl = "I found you{{#socials}} on {{socials}}{{/socials}}{{^socials}} online{{/socials}}.";
  assert.equal(render(tpl, full), "I found you on @adabakes.");
  assert.equal(render(tpl, empty), "I found you online.");
});

test("lines that become empty are removed, and punctuation is tidied", () => {
  const tpl = "Hello {{first_name}},\nSocials: {{socials}}\n{{socials}}\nThanks";
  assert.equal(render(tpl, empty), "Hello there,\nThanks");
  assert.equal(render("Great to meet you {{socials}}.", empty), "Great to meet you.");
});

test("never leaves a {{placeholder}} in the output", () => {
  const out = render("{{name}} {{email}} {{phone}} {{socials}} {{first_name}}", empty);
  assert.ok(!out.includes("{{"));
});

test("validateTemplate catches unknown fields and broken blocks", () => {
  assert.deepEqual(validateTemplate("Hi {{first_name}} {{#socials}}{{socials}}{{/socials}}"), []);
  assert.ok(validateTemplate("Hi {{company}}").some((p) => /Unknown merge field/.test(p)));
  assert.ok(validateTemplate("{{#socials}} open").some((p) => /Unclosed/.test(p)));
  assert.ok(validateTemplate("{{/socials}}").some((p) => /closes nothing/.test(p)));
  assert.ok(validateTemplate("Hi {{name").some((p) => /no matching/.test(p)));
});

test("WhatsApp messages always carry an opt-out line", () => {
  assert.equal(withWhatsAppOptOut("Hello"), "Hello\n\nReply STOP to opt out.");
  assert.equal(withWhatsAppOptOut("Hello. Reply STOP to unsubscribe."), "Hello. Reply STOP to unsubscribe.");
  assert.ok(hasWhatsAppOptOut("Text 'opt-out' anytime"));
});

test("emails always end with an unsubscribe line, with or without a link", () => {
  assert.match(emailFooter({ unsubscribeUrl: "https://x.test/unsubscribe?e=a&t=b" }), /Unsubscribe here: https:\/\/x\.test/);
  assert.match(emailFooter({}), /Reply with "UNSUBSCRIBE"/);
  const e = buildEmail({ subject: "  Hi  there ", body: "Hello <b>Ada</b>\n\nSee https://example.com", footer: emailFooter({}) });
  assert.equal(e.subject, "Hi there");
  assert.ok(e.text.endsWith('won\'t email you again.'));
  assert.ok(e.html.includes("&lt;b&gt;Ada&lt;/b&gt;"), "lead data is escaped in HTML");
  assert.ok(e.html.includes('<a href="https://example.com">'));
});

test("WhatsApp template parameters are rendered per lead and never empty", () => {
  const s = mergeSettings({ whatsapp: { mode: "template", templateName: "intro", templateParams: ["{{first_name}}", "{{socials}}"], templateBody: "Hi {{1}}, {{2}}" } });
  const a = composeWhatsApp(full, s);
  assert.deepEqual(a.params, ["Ada", "@adabakes"]);
  assert.equal(a.preview, "Hi Ada, @adabakes");
  const b = composeWhatsApp(empty, s);
  assert.deepEqual(b.params, ["there", "-"], "Cloud API rejects empty parameters");
});

test("validateSettings blocks broken templates and warns about missing opt-out", () => {
  const bad = validateSettings(mergeSettings({ email: { subject: "" }, whatsapp: { templateName: "" } }));
  assert.ok(bad.errors.some((e) => /subject is empty/.test(e)));
  assert.ok(bad.errors.some((e) => /template name is empty/.test(e)));
  const warn = validateSettings(mergeSettings({ whatsapp: { templateName: "t", templateBody: "Hi {{1}}", templateParams: ["{{first_name}}"] } }), { publicBaseUrl: "x", unsubscribeSecret: "y" });
  assert.deepEqual(warn.errors, []);
  assert.ok(warn.warnings.some((w) => /no opt-out line/.test(w)));
});

test("previewLead renders both channels without sending", () => {
  const p = previewLead({ ...full, emailValid: true }, mergeSettings({ whatsapp: { mode: "text", text: "Hi {{first_name}}" } }), {});
  assert.equal(p.email.to, "ada@example.com");
  assert.ok(p.email.text.includes("UNSUBSCRIBE"));
  assert.equal(p.whatsapp.preview, "Hi Ada\n\nReply STOP to opt out.");
});
