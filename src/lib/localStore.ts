import { createStore, get, set, del } from 'idb-keyval'
import {
  NotAuthorizedError,
  OutOfFilmError,
  type EventInfo,
  type Guest,
  type Photo,
  type Store,
} from './types'
import { randomCode, randomKey, uuid } from './util'

/*
  Demo backend: everything lives in this browser's IndexedDB.
  Good for trying the full flow on one device. For a real event
  (many phones, one album) configure Supabase instead.
*/

const db = createStore('flashback', 'data')

interface LocalEvent extends EventInfo {
  hostKey: string
}
interface LocalGuest extends Guest {
  deviceId: string
}
type LocalPhoto = Omit<Photo, 'url' | 'guestName'>

const eventKey = (code: string) => `event:${code}`
const guestsKey = (eventId: string) => `guests:${eventId}`
const photosKey = (eventId: string) => `photos:${eventId}`
const blobKey = (photoId: string) => `blob:${photoId}`

const urlCache = new Map<string, string>()

async function loadEvent(code: string): Promise<LocalEvent | null> {
  return (await get<LocalEvent>(eventKey(code.toUpperCase()), db)) ?? null
}

async function requireHost(code: string, hostKey: string): Promise<LocalEvent> {
  const ev = await loadEvent(code)
  if (!ev || ev.hostKey !== hostKey) throw new NotAuthorizedError()
  return ev
}

function publicEvent({ hostKey: _hostKey, ...ev }: LocalEvent): EventInfo {
  return ev
}

function publicGuest({ deviceId: _deviceId, ...g }: LocalGuest): Guest {
  return g
}

async function toPhotos(eventId: string, rows: LocalPhoto[]): Promise<Photo[]> {
  const guests = (await get<LocalGuest[]>(guestsKey(eventId), db)) ?? []
  const names = new Map(guests.map((g) => [g.id, g.name]))
  const out: Photo[] = []
  for (const row of rows) {
    let url = urlCache.get(row.id)
    if (!url) {
      const blob = await get<Blob>(blobKey(row.id), db)
      if (!blob) continue
      url = URL.createObjectURL(blob)
      urlCache.set(row.id, url)
    }
    out.push({ ...row, url, guestName: names.get(row.guestId) ?? 'Guest' })
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export const localStore: Store = {
  mode: 'local',

  async createEvent(input) {
    let code = randomCode()
    while (await loadEvent(code)) code = randomCode()
    const ev: LocalEvent = {
      ...input,
      id: uuid(),
      code,
      createdAt: new Date().toISOString(),
      hostKey: randomKey(),
    }
    await set(eventKey(code), ev, db)
    return { event: publicEvent(ev), hostKey: ev.hostKey }
  },

  async getEvent(code) {
    const ev = await loadEvent(code)
    return ev ? publicEvent(ev) : null
  },

  async updateEvent(code, hostKey, patch) {
    const ev = await requireHost(code, hostKey)
    const next = { ...ev, ...patch }
    await set(eventKey(ev.code), next, db)
    return publicEvent(next)
  },

  async joinEvent(code, name, deviceId) {
    const ev = await loadEvent(code)
    if (!ev) throw new Error('Event not found')
    const guests = (await get<LocalGuest[]>(guestsKey(ev.id), db)) ?? []
    let guest = guests.find((g) => g.deviceId === deviceId)
    if (guest) {
      guest.name = name
    } else {
      guest = { id: uuid(), eventId: ev.id, name, deviceId, shotsUsed: 0 }
      guests.push(guest)
    }
    await set(guestsKey(ev.id), guests, db)
    return publicGuest(guest)
  },

  async getGuest(code, deviceId) {
    const ev = await loadEvent(code)
    if (!ev) return null
    const guests = (await get<LocalGuest[]>(guestsKey(ev.id), db)) ?? []
    const guest = guests.find((g) => g.deviceId === deviceId)
    return guest ? publicGuest(guest) : null
  },

  async uploadPhoto({ code, deviceId, photoId, blob }) {
    const ev = await loadEvent(code)
    if (!ev) throw new Error('Event not found')
    const guests = (await get<LocalGuest[]>(guestsKey(ev.id), db)) ?? []
    const guest = guests.find((g) => g.deviceId === deviceId)
    if (!guest) throw new Error('Join the event first')
    const photos = (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? []
    if (photos.some((p) => p.id === photoId)) return
    if (guest.shotsUsed >= ev.shotsPerGuest) throw new OutOfFilmError()
    await set(blobKey(photoId), blob, db)
    photos.push({ id: photoId, eventId: ev.id, guestId: guest.id, createdAt: new Date().toISOString(), hidden: false })
    guest.shotsUsed += 1
    await set(photosKey(ev.id), photos, db)
    await set(guestsKey(ev.id), guests, db)
  },

  async listPhotos(code) {
    const ev = await loadEvent(code)
    if (!ev || new Date(ev.revealAt).getTime() > Date.now()) return []
    const rows = (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? []
    return toPhotos(ev.id, rows.filter((p) => !p.hidden))
  },

  async hostListPhotos(code, hostKey) {
    const ev = await requireHost(code, hostKey)
    return toPhotos(ev.id, (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? [])
  },

  async hostSetHidden(code, hostKey, photoId, hidden) {
    const ev = await requireHost(code, hostKey)
    const rows = (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? []
    await set(photosKey(ev.id), rows.map((p) => (p.id === photoId ? { ...p, hidden } : p)), db)
  },

  async hostDeletePhoto(code, hostKey, photoId) {
    const ev = await requireHost(code, hostKey)
    const rows = (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? []
    await set(photosKey(ev.id), rows.filter((p) => p.id !== photoId), db)
    await del(blobKey(photoId), db)
    const url = urlCache.get(photoId)
    if (url) URL.revokeObjectURL(url)
    urlCache.delete(photoId)
  },

  async hostStats(code, hostKey) {
    const ev = await requireHost(code, hostKey)
    const guests = (await get<LocalGuest[]>(guestsKey(ev.id), db)) ?? []
    const photos = (await get<LocalPhoto[]>(photosKey(ev.id), db)) ?? []
    return { guests: guests.length, photos: photos.length }
  },
}
