export type FilmStyle = 'classic' | 'bw' | 'golden'

export interface EventInfo {
  id: string
  code: string
  title: string
  eventDate: string // YYYY-MM-DD
  shotsPerGuest: number
  revealAt: string // ISO timestamp; photos are hidden from guests until then
  film: FilmStyle
  dateStamp: boolean
  createdAt: string
}

export interface NewEventInput {
  title: string
  eventDate: string
  shotsPerGuest: number
  revealAt: string
  film: FilmStyle
  dateStamp: boolean
}

export type EventPatch = Partial<Pick<EventInfo, 'title' | 'shotsPerGuest' | 'revealAt' | 'film' | 'dateStamp'>>

export interface Guest {
  id: string
  eventId: string
  name: string
  shotsUsed: number
}

export interface Photo {
  id: string
  eventId: string
  guestId: string
  guestName: string
  url: string
  createdAt: string
  hidden: boolean
}

export interface EventStats {
  guests: number
  photos: number
}

export class OutOfFilmError extends Error {
  constructor() {
    super('Out of film')
    this.name = 'OutOfFilmError'
  }
}

export class NotAuthorizedError extends Error {
  constructor() {
    super('Invalid host link')
    this.name = 'NotAuthorizedError'
  }
}

/**
 * Everything the UI needs from a backend. Two implementations:
 * - localStore: IndexedDB in this browser only (demo mode, no setup)
 * - supabaseStore: shared Postgres + Storage, used when env vars are set
 */
export interface Store {
  mode: 'local' | 'supabase'
  createEvent(input: NewEventInput): Promise<{ event: EventInfo; hostKey: string }>
  getEvent(code: string): Promise<EventInfo | null>
  updateEvent(code: string, hostKey: string, patch: EventPatch): Promise<EventInfo>
  joinEvent(code: string, name: string, deviceId: string): Promise<Guest>
  getGuest(code: string, deviceId: string): Promise<Guest | null>
  /** Idempotent by photoId, so retried uploads never use up two shots. */
  uploadPhoto(args: { code: string; deviceId: string; photoId: string; blob: Blob }): Promise<void>
  /** Guest view: only visible photos, and only after the reveal time. */
  listPhotos(code: string): Promise<Photo[]>
  /** Host view: every photo, including hidden ones, at any time. */
  hostListPhotos(code: string, hostKey: string): Promise<Photo[]>
  hostSetHidden(code: string, hostKey: string, photoId: string, hidden: boolean): Promise<void>
  hostDeletePhoto(code: string, hostKey: string, photoId: string): Promise<void>
  hostStats(code: string, hostKey: string): Promise<EventStats>
}
