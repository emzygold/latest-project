import { addMessage, availableListings, db, history, upsertLead } from './db.js';
import { notifyLead } from './notify.js';

const AGENCY = () => process.env.AGENCY_NAME || 'Ease Estate';
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');

const SYSTEM = (listings) => `You are the property assistant for ${AGENCY()}, a real estate agency in Nigeria. You chat with buyers and renters on behalf of the agent.

Rules:
- Only talk about the listings below. Never invent properties, prices, or details. If nothing fits, say so and offer to note their requirements for the agent.
- Be warm, short, and clear (2-4 sentences). Simple English. This is often WhatsApp, so no markdown.
- Quote prices in naira. Rent prices are per year.
- Your second job is to capture the lead naturally: find out if they want to buy or rent, budget, preferred area, timeline, their name and phone number. Ask one question at a time, never interrogate.
- Call the capture_lead tool every time you learn something new (only include fields you actually learned).
- When they want to see a property, collect name and phone and tell them the agent will confirm an inspection time shortly.
- Do not negotiate price or promise anything the agent has not confirmed.

Current available listings (JSON):
${JSON.stringify(listings.map(({ id, title, type, price, location, bedrooms, bathrooms, description }) => ({ id, title, type, price, location, bedrooms, bathrooms, description })))}`;

const TOOLS = [{
  name: 'capture_lead',
  description: 'Save or update what you have learned about this prospect. Only include fields you actually learned.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      phone: { type: 'string', description: 'Phone number as given' },
      email: { type: 'string' },
      intent: { type: 'string', enum: ['buy', 'rent'] },
      budget: { type: 'integer', description: 'Budget in naira' },
      location: { type: 'string', description: 'Preferred area' },
      timeline: { type: 'string', description: 'When they want to move or buy' },
      listing_id: { type: 'integer', description: 'ID of the listing they are most interested in' },
      summary: { type: 'string', description: 'One-line summary of what they want, for the agent' },
    },
  },
}];

/** Main entry: returns { reply, lead } and persists everything. */
export async function handleMessage({ sessionId, channel = 'web', text, knownPhone }) {
  addMessage(sessionId, 'user', text);
  upsertLead(sessionId, channel, { phone: knownPhone }); // make sure the lead row exists with the right channel
  const listings = availableListings();
  const run = process.env.ANTHROPIC_API_KEY ? claudeTurn : fallbackTurn;
  let { reply, patch } = await run(sessionId, listings, text).catch((err) => {
    console.error('AI error, using fallback:', err.message);
    return fallbackTurn(sessionId, listings, text);
  });
  addMessage(sessionId, 'assistant', reply);
  const before = upsertLead(sessionId, channel, patch);
  const lead = await maybeNotify(before);
  return { reply, lead };
}

// Notify the agent once we can call the prospect back AND know what they want.
async function maybeNotify(lead) {
  if (lead.phone && lead.intent && !lead.notified) {
    db.prepare('UPDATE leads SET notified = 1 WHERE id = ?').run(lead.id);
    notifyLead(lead).catch((e) => console.error('notify failed:', e.message));
    return { ...lead, notified: 1 };
  }
  return lead;
}

async function claudeTurn(sessionId, listings) {
  const messages = history(sessionId).map((m) => ({ role: m.role, content: m.content }));
  const patch = {};
  for (let i = 0; i < 3; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 600,
        system: SYSTEM(listings),
        tools: TOOLS,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const toolUses = data.content.filter((b) => b.type === 'tool_use');
    for (const t of toolUses) Object.assign(patch, t.input);
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!toolUses.length || data.stop_reason !== 'tool_use') {
      return { reply: text || "Thanks! The agent will get back to you shortly.", patch };
    }
    messages.push({ role: 'assistant', content: data.content });
    messages.push({
      role: 'user',
      content: toolUses.map((t) => ({ type: 'tool_result', tool_use_id: t.id, content: 'saved' })),
    });
  }
  return { reply: 'Thanks! The agent will get back to you shortly.', patch };
}

// ---------- No-API-key fallback: rule-based, good enough to demo and test ----------

export function parseBudget(text) {
  const m = text.toLowerCase().replace(/,/g, '').match(/(?:₦|n|ngn)?\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?\b/g);
  if (!m) return undefined;
  for (const raw of m) {
    const mm = raw.match(/(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/);
    let n = parseFloat(mm[1]);
    const unit = mm[2];
    if (unit === 'm' || unit === 'million') n *= 1e6;
    else if (unit === 'k' || unit === 'thousand') n *= 1e3;
    if (n >= 100000) return Math.round(n); // ignore small numbers like "3 bedroom"
  }
  return undefined;
}

export function fallbackExtract(text) {
  const patch = {};
  const phone = text.replace(/[\s-]/g, '').match(/(?:\+?234|0)[789][01]\d{8}/);
  if (phone) patch.phone = phone[0];
  const name = text.match(/(?:my name is|i am|i'm|this is)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/i);
  if (name) patch.name = name[1];
  if (/\b(rent|renting|lease)\b/i.test(text)) patch.intent = 'rent';
  else if (/\b(buy|purchase|buying)\b/i.test(text)) patch.intent = 'buy';
  const budget = parseBudget(text.replace(phone ? phone[0] : '', ''));
  if (budget) patch.budget = budget;
  const tl = text.match(/\b(this (?:week|month)|next (?:week|month)|asap|immediately|(?:in )?\d+ (?:days?|weeks?|months?))\b/i);
  if (tl) patch.timeline = tl[1];
  return patch;
}

async function fallbackTurn(sessionId, listings, text) {
  const patch = fallbackExtract(text);
  const lower = text.toLowerCase();
  const known = db.prepare('SELECT * FROM leads WHERE session_id = ?').get(sessionId) || {};
  const state = { ...known, ...patch };

  const isQuery = /\b(rent|buy|bed|bedroom|flat|house|apartment|duplex|land|price|available|show|see|tell me about|looking|inspection)\b/i.test(text);
  const bedMatch = lower.match(/(\d)\s*(?:bed|br)/);
  const hits = !isQuery ? [] : listings.filter((l) => {
    if (state.intent && l.type !== (state.intent === 'buy' ? 'sale' : 'rent')) return false;
    if (state.budget && l.price > state.budget * 1.1) return false;
    if (bedMatch && l.bedrooms !== Number(bedMatch[1])) return false;
    const area = l.location.toLowerCase().split(/[ ,]+/).filter((w) => w.length > 3);
    const wanted = area.some((w) => lower.includes(w));
    return wanted || !/\b(in|at|around|near)\s+\w+/i.test(text);
  }).slice(0, 3);

  const parts = [];
  if (hits.length) {
    patch.listing_id = hits[0].id;
    if (!state.location) patch.location = hits[0].location;
    parts.push('Found some 👀 ' + hits.map((l) => `${l.title} (${naira(l.price)}${l.type === 'rent' ? '/year' : ''})`).join(', ') + '.');
  } else if (isQuery) {
    parts.push("I don't have an exact match right now, but I'll note what you need for the agent.");
  } else if (!Object.keys(patch).length) {
    parts.push(`Hi, welcome to ${AGENCY()}! Are you looking to buy or rent?`);
  }
  if (!state.intent) parts.push('Are you looking to buy or rent?');
  else if (!state.name) parts.push("What's your name?");
  else if (!state.phone) parts.push('What number can the agent reach you on to arrange an inspection?');
  else if (!state.budget) parts.push('What is your budget?');
  else parts.push('Thanks! The agent will contact you shortly to confirm an inspection.');

  patch.summary = [state.intent, state.budget && naira(state.budget), patch.location || state.location].filter(Boolean).join(' · ') || undefined;
  return { reply: parts.join(' '), patch };
}
