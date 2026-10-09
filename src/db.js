import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const file = process.env.DB_FILE || 'data/ease-estate.db';
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sale',        -- sale | rent
  price INTEGER NOT NULL,                   -- naira (rent = per year)
  location TEXT NOT NULL,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available', -- available | taken
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,                       -- user | assistant
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'web',      -- web | whatsapp
  name TEXT, phone TEXT, email TEXT,
  intent TEXT,                              -- buy | rent
  budget INTEGER,
  location TEXT,
  timeline TEXT,
  listing_id INTEGER,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'new',       -- new | contacted | inspection | won | lost
  notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export const LEAD_FIELDS = ['name', 'phone', 'email', 'intent', 'budget', 'location', 'timeline', 'listing_id', 'summary'];

export function upsertLead(sessionId, channel, patch) {
  const clean = {};
  for (const k of LEAD_FIELDS) if (patch[k] !== undefined && patch[k] !== null && patch[k] !== '') clean[k] = patch[k];
  const existing = db.prepare('SELECT * FROM leads WHERE session_id = ?').get(sessionId);
  if (!existing) {
    const cols = ['session_id', 'channel', ...Object.keys(clean)];
    db.prepare(`INSERT INTO leads (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .run(sessionId, channel, ...Object.values(clean));
  } else if (Object.keys(clean).length) {
    const sets = Object.keys(clean).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE leads SET ${sets}, updated_at = datetime('now') WHERE session_id = ?`)
      .run(...Object.values(clean), sessionId);
  }
  return db.prepare('SELECT * FROM leads WHERE session_id = ?').get(sessionId);
}

export const history = (sessionId, limit = 20) =>
  db.prepare('SELECT role, content FROM (SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id')
    .all(sessionId, limit);

export const addMessage = (sessionId, role, content) =>
  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, role, content);

export const availableListings = () =>
  db.prepare("SELECT * FROM listings WHERE status = 'available' ORDER BY id DESC").all();
