import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';
process.env.ADMIN_TOKEN = 'test-token';
delete process.env.ANTHROPIC_API_KEY;
delete process.env.N8N_WEBHOOK_URL;

const { createApp } = await import('../src/server.js');
const { parseBudget, fallbackExtract } = await import('../src/ai.js');

let server, base;
const auth = { authorization: 'Bearer test-token', 'content-type': 'application/json' };
const post = (path, body, headers = { 'content-type': 'application/json' }) =>
  fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });

before(async () => {
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
  await post('/api/listings', { title: '2 Bedroom Apartment, Yaba', type: 'rent', price: 2800000, location: 'Yaba, Lagos', bedrooms: 2, bathrooms: 2 }, auth);
  await post('/api/listings', { title: '4 Bedroom Duplex, Ajah', type: 'sale', price: 85000000, location: 'Ajah, Lagos', bedrooms: 4, bathrooms: 5 }, auth);
});
after(() => server.close());

test('budget and field parsing', () => {
  assert.equal(parseBudget('about 3m'), 3_000_000);
  assert.equal(parseBudget('₦2,800,000 please'), 2_800_000);
  assert.equal(parseBudget('I need 3 bedroom'), undefined);
  const p = fallbackExtract("Hi my name is Tunde Bello, I want to rent, call 08031234567, budget 3 million, next month");
  assert.equal(p.name, 'Tunde Bello'); assert.equal(p.phone, '08031234567');
  assert.equal(p.intent, 'rent'); assert.equal(p.budget, 3_000_000); assert.equal(p.timeline, 'next month');
});

test('admin API requires the token', async () => {
  assert.equal((await fetch(base + '/api/leads')).status, 401);
  assert.equal((await fetch(base + '/api/leads', { headers: { authorization: 'Bearer nope' } })).status, 401);
  assert.equal((await fetch(base + '/api/leads', { headers: auth })).status, 200);
});

test('listing validation', async () => {
  assert.equal((await post('/api/listings', { title: 'x' }, auth)).status, 400);
  assert.equal((await post('/api/listings', { title: 'x', location: 'y', price: -5 }, auth)).status, 400);
});

test('web chat captures a lead end to end', async () => {
  const sid = 'session-web-0001';
  let r = await (await post('/api/chat', { session_id: sid, message: 'Hi, I want to rent a 2 bedroom in Yaba' })).json();
  assert.match(r.reply, /Yaba/);
  r = await (await post('/api/chat', { session_id: sid, message: 'my name is Ada Okafor, budget 3m' })).json();
  r = await (await post('/api/chat', { session_id: sid, message: 'call me on 08031234567' })).json();
  const leads = await (await fetch(base + '/api/leads', { headers: auth })).json();
  const lead = leads.find((l) => l.session_id === sid);
  assert.equal(lead.name, 'Ada Okafor'); assert.equal(lead.phone, '08031234567');
  assert.equal(lead.intent, 'rent'); assert.equal(lead.budget, 3_000_000);
  assert.equal(lead.notified, 1);
  const msgs = await (await fetch(`${base}/api/leads/${lead.id}/messages`, { headers: auth })).json();
  assert.equal(msgs.length, 6);
});

test('bot does not offer listings above budget or wrong type', async () => {
  const r = await (await post('/api/chat', { session_id: 'session-web-0002', message: 'I want to buy a house, budget 5m' })).json();
  assert.doesNotMatch(r.reply, /Duplex/);
});

test('whatsapp webhook replies with TwiML and records the phone', async () => {
  const res = await fetch(base + '/api/whatsapp', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: 'whatsapp:+2348031230000', Body: 'I want to rent a flat in Yaba' }),
  });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /<Response><Message>.*Yaba.*<\/Message><\/Response>/);
  const leads = await (await fetch(base + '/api/leads', { headers: auth })).json();
  const lead = leads.find((l) => l.channel === 'whatsapp');
  assert.equal(lead.phone, '+2348031230000'); assert.equal(lead.notified, 1);
});

test('lead status can be updated, with validation', async () => {
  const [lead] = await (await fetch(base + '/api/leads', { headers: auth })).json();
  const ok = await fetch(`${base}/api/leads/${lead.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'inspection' }) });
  assert.equal((await ok.json()).status, 'inspection');
  const bad = await fetch(`${base}/api/leads/${lead.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'banana' }) });
  assert.equal(bad.status, 400);
});
