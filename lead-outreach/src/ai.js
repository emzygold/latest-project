// Optional per-lead variation using Claude. The model only ever sees the already-rendered
// message and the lead's own CSV fields, and every output is checked for invented facts.
// If anything looks off, the original rendered message is used instead.
import Anthropic from "@anthropic-ai/sdk";
import { leadValues, hasWhatsAppOptOut } from "./template.js";

const SYSTEM = `You lightly rephrase outreach messages so each recipient gets a natural, slightly different wording.
Rules:
- Keep the meaning, offer, call to action and tone of the original message.
- Use ONLY facts that appear in the original message or in the lead data provided. Never invent details about the lead (no guesses about their business, location, achievements, numbers, dates or links).
- Do not add any URL, email address, phone number, @handle, price, number or name that is not already in the original message or the lead data.
- Keep any opt-out or unsubscribe sentence exactly as written.
- Keep roughly the same length. Plain text only. Return only the rewritten message, with no preamble.`;

const tokens = (text, re) => new Set((String(text).match(re) || []).map((t) => t.toLowerCase().replace(/[.,!?;:)]+$/, "")));
const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const HANDLE_RE = /(?<![\w.])@[A-Za-z0-9_.]{2,}/g;
const NUMBER_RE = /\d[\d,.:/-]*/g;

/**
 * Check a variation against the original. Returns a list of problems; empty = safe.
 * Anything concrete (links, emails, handles, numbers) must already exist in the
 * original message or the lead's own data.
 */
export function checkVariation(original, variant, lead) {
  const problems = [];
  const v = String(variant ?? "").trim();
  if (!v) return ["Empty response"];
  const source = `${original}\n${Object.values(leadValues(lead)).join("\n")}`;
  for (const [label, re] of [["link", URL_RE], ["email address", EMAIL_RE], ["handle", HANDLE_RE], ["number", NUMBER_RE]]) {
    const allowed = tokens(source, re);
    for (const t of tokens(v, re)) if (!allowed.has(t)) problems.push(`Added a ${label} not in the data: ${t}`);
  }
  if (hasWhatsAppOptOut(original) && !hasWhatsAppOptOut(v)) problems.push("Dropped the opt-out line");
  const ratio = v.length / Math.max(1, String(original).length);
  if (ratio < 0.5 || ratio > 1.6) problems.push("Length changed too much");
  if (/\{\{|\}\}/.test(v)) problems.push("Left a merge placeholder");
  return problems;
}

export function createAi(cfg, client) {
  const enabled = Boolean(client || cfg.apiKey);
  const anthropic = client || (cfg.apiKey ? new Anthropic({ apiKey: cfg.apiKey, maxRetries: 2 }) : null);

  return {
    enabled,
    model: cfg.model,
    /** Returns { text, usedAi, note }. Never throws: falls back to the original text. */
    async vary(original, lead, channel) {
      if (!anthropic) return { text: original, usedAi: false, note: "AI not configured" };
      const data = leadValues(lead);
      const leadData = Object.entries(data)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      try {
        const response = await anthropic.beta.messages.create({
          model: cfg.model,
          max_tokens: 2000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: `Channel: ${channel}\n\n<lead_data>\n${leadData || "(no extra data)"}\n</lead_data>\n\n<original_message>\n${original}\n</original_message>`,
            },
          ],
        });
        if (response.stop_reason === "refusal") return { text: original, usedAi: false, note: "AI declined; original used" };
        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
        const problems = checkVariation(original, text, lead);
        if (problems.length) return { text: original, usedAi: false, note: `AI variation rejected (${problems[0]}); original used` };
        return { text, usedAi: true, note: "" };
      } catch (err) {
        return { text: original, usedAi: false, note: `AI unavailable (${err.status || err.name}); original used` };
      }
    },
  };
}
