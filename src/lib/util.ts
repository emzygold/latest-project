export function uuid(): string {
  return crypto.randomUUID()
}

// No 0/O/1/I/L so codes are easy to read off a printed card.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

export function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!)
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the app still works for this session.
  }
}

let memoryDeviceId: string | null = null

export function getDeviceId(): string {
  const existing = safeGet('fb:device')
  if (existing) return existing
  memoryDeviceId ??= uuid()
  safeSet('fb:device', memoryDeviceId)
  return memoryDeviceId
}

export interface SavedHostEvent {
  code: string
  title: string
  hostKey: string
}

export function getSavedHostEvents(): SavedHostEvent[] {
  try {
    return JSON.parse(safeGet('fb:host-events') ?? '[]')
  } catch {
    return []
  }
}

export function saveHostEvent(entry: SavedHostEvent) {
  const rest = getSavedHostEvents().filter((e) => e.code !== entry.code)
  safeSet('fb:host-events', JSON.stringify([entry, ...rest]))
}

export function getHostKey(code: string): string | null {
  return getSavedHostEvents().find((e) => e.code === code)?.hostKey ?? null
}

export function formatEventDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function isRevealed(revealAt: string, now = Date.now()): boolean {
  return new Date(revealAt).getTime() <= now
}

export function guestUrl(code: string): string {
  return `${window.location.origin}/e/${code}`
}

export function hostUrl(code: string, hostKey: string): string {
  return `${window.location.origin}/host/${code}#key=${hostKey}`
}

/** Value for <input type="datetime-local"> in the user's own time zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
