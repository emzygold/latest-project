import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { handleMessage } from './ai.js';

const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const STATUSES = ['new', 'contacted', 'inspection', 'won', 'lost'];

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
};

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e6) throw Object.assign(new Error('Body too large'), { code: 413 });
  }
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  return {};
}

function isAdmin(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false; // admin API stays closed until a token is configured
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const xml = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

function validListing(b) {
  const price = Number(b.price);
  if (!b.title || !b.location || !Number.isFinite(price) || price <= 0) return null;
  return {
    title: String(b.title).slice(0, 200), type: b.type === 'rent' ? 'rent' : 'sale', price: Math.round(price),
    location: String(b.location).slice(0, 200), bedrooms: Number(b.bedrooms) || 0, bathrooms: Number(b.bathrooms) || 0,
    description: String(b.description || '').slice(0, 2000), status: b.status === 'taken' ? 'taken' : 'available',
  };
}

async function api(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  // ---- public: chat widget ----
  if (pathname === '/api/chat' && method === 'POST') {
    const b = await readBody(req);
    const text = String(b.message || '').trim().slice(0, 1000);
    if (!text) return json(res, 400, { error: 'message required' });
    const sessionId = /^[\w-]{8,64}$/.test(b.session_id || '') ? b.session_id : randomUUID();
    const { reply, lead } = await handleMessage({ sessionId, channel: 'web', text });
    const listing = lead.listing_id ? db.prepare("SELECT id,title,type,price,location,bedrooms,bathrooms FROM listings WHERE id = ?").get(lead.listing_id) : null;
    return json(res, 200, { reply, session_id: sessionId, listing });
  }
  if (pathname === '/api/public/listings' && method === 'GET') {
    return json(res, 200, db.prepare("SELECT id,title,type,price,location,bedrooms,bathrooms,description FROM listings WHERE status = 'available' ORDER BY id DESC").all());
  }
  if (pathname === '/api/config' && method === 'GET') {
    return json(res, 200, { agency: process.env.AGENCY_NAME || 'Ease Estate' });
  }

  // ---- public: WhatsApp via Twilio (set as the number's "when a message comes in" URL) ----
  if (pathname === '/api/whatsapp' && method === 'POST') {
    const b = await readBody(req);
    const from = String(b.From || '').replace(/[^\w+:]/g, '');
    const text = String(b.Body || '').trim().slice(0, 1000);
    if (!from || !text) return json(res, 400, { error: 'From and Body required' });
    const { reply } = await handleMessage({
      sessionId: `wa-${from}`, channel: 'whatsapp', text, knownPhone: from.replace(/^whatsapp:/, ''),
    });
    res.writeHead(200, { 'content-type': 'text/xml' });
    return res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(reply)}</Message></Response>`);
  }

  // ---- admin ----
  if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' });

  if (pathname === '/api/listings' && method === 'GET') return json(res, 200, db.prepare('SELECT * FROM listings ORDER BY id DESC').all());
  if (pathname === '/api/listings' && method === 'POST') {
    const l = validListing(await readBody(req));
    if (!l) return json(res, 400, { error: 'title, location and a positive price are required' });
    const info = db.prepare('INSERT INTO listings (title,type,price,location,bedrooms,bathrooms,description,status) VALUES (?,?,?,?,?,?,?,?)')
      .run(l.title, l.type, l.price, l.location, l.bedrooms, l.bathrooms, l.description, l.status);
    return json(res, 201, db.prepare('SELECT * FROM listings WHERE id = ?').get(info.lastInsertRowid));
  }
  const lm = pathname.match(/^\/api\/listings\/(\d+)$/);
  if (lm) {
    const id = Number(lm[1]);
    const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
    if (!row) return json(res, 404, { error: 'not found' });
    if (method === 'DELETE') { db.prepare('DELETE FROM listings WHERE id = ?').run(id); return json(res, 200, { ok: true }); }
    if (method === 'PATCH') {
      const l = validListing({ ...row, ...(await readBody(req)) });
      if (!l) return json(res, 400, { error: 'invalid listing' });
      db.prepare('UPDATE listings SET title=?,type=?,price=?,location=?,bedrooms=?,bathrooms=?,description=?,status=? WHERE id=?')
        .run(l.title, l.type, l.price, l.location, l.bedrooms, l.bathrooms, l.description, l.status, id);
      return json(res, 200, db.prepare('SELECT * FROM listings WHERE id = ?').get(id));
    }
  }

  if (pathname === '/api/leads' && method === 'GET') {
    const status = url.searchParams.get('status');
    const rows = db.prepare(`
      SELECT leads.*, listings.title AS listing_title FROM leads LEFT JOIN listings ON listings.id = leads.listing_id
      ${status ? 'WHERE leads.status = ?' : ''} ORDER BY leads.updated_at DESC, leads.id DESC`).all(...(status ? [status] : []));
    return json(res, 200, rows);
  }
  const lead = pathname.match(/^\/api\/leads\/(\d+)(\/messages)?$/);
  if (lead) {
    const id = Number(lead[1]);
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!row) return json(res, 404, { error: 'not found' });
    if (lead[2] && method === 'GET') {
      return json(res, 200, db.prepare('SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY id').all(row.session_id));
    }
    if (method === 'PATCH') {
      const b = await readBody(req);
      if (!STATUSES.includes(b.status)) return json(res, 400, { error: `status must be one of ${STATUSES.join(', ')}` });
      db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(b.status, id);
      return json(res, 200, db.prepare('SELECT * FROM leads WHERE id = ?').get(id));
    }
  }

  if (pathname === '/api/stats' && method === 'GET') {
    const by = db.prepare('SELECT status, COUNT(*) n FROM leads GROUP BY status').all();
    return json(res, 200, {
      leads: Object.fromEntries(by.map((r) => [r.status, r.n])),
      total: by.reduce((a, r) => a + r.n, 0),
      with_phone: db.prepare('SELECT COUNT(*) n FROM leads WHERE phone IS NOT NULL').get().n,
      listings: db.prepare("SELECT COUNT(*) n FROM listings WHERE status = 'available'").get().n,
    });
  }
  return json(res, 404, { error: 'not found' });
}

async function serveStatic(res, pathname) {
  const map = { '/': '/index.html', '/chat': '/chat.html', '/listings': '/listings.html', '/dashboard': '/dashboard.html' };
  const rel = normalize(map[pathname] || pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const data = await readFile(join(PUBLIC_DIR, rel));
    res.writeHead(200, { 'content-type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE' });
        return res.end();
      }
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return await serveStatic(res, url.pathname);
    } catch (err) {
      console.error(err);
      const code = err.code === 413 ? 413 : err instanceof SyntaxError ? 400 : 500;
      if (!res.headersSent) json(res, code, { error: { 413: 'body too large', 400: 'invalid JSON', 500: 'server error' }[code] });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`Ease Estate running on http://localhost:${port}`);
    console.log(`  chat:      http://localhost:${port}/chat`);
    console.log(`  dashboard: http://localhost:${port}/dashboard`);
    if (!process.env.ADMIN_TOKEN) console.warn('  ! ADMIN_TOKEN not set: the dashboard/admin API is locked. Set it in .env');
    if (!process.env.ANTHROPIC_API_KEY) console.warn('  ! ANTHROPIC_API_KEY not set: using the built-in fallback bot');
  });
}
