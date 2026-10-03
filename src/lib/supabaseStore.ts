import { createClient, type PostgrestError } from '@supabase/supabase-js'
import { NotAuthorizedError, OutOfFilmError, type EventInfo, type Guest, type Photo, type Store } from './types'

interface PhotoRow {
  id: string
  guest_id: string
  guest_name: string
  storage_path: string
  created_at: string
  hidden: boolean
}

export function createSupabaseStore(url: string, anonKey: string): Store {
  const sb = createClient(url, anonKey, { auth: { persistSession: false } })
  const bucket = sb.storage.from('photos')

  function fail(error: PostgrestError | null): void {
    if (!error) return
    if (error.message.includes('OUT_OF_FILM')) throw new OutOfFilmError()
    if (error.message.includes('NOT_AUTHORIZED')) throw new NotAuthorizedError()
    throw new Error(error.message)
  }

  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.rpc(fn, args)
    fail(error)
    return data as T
  }

  function toPhotos(eventId: string, rows: PhotoRow[]): Photo[] {
    return rows.map((r) => ({
      id: r.id,
      eventId,
      guestId: r.guest_id,
      guestName: r.guest_name,
      url: bucket.getPublicUrl(r.storage_path).data.publicUrl,
      createdAt: r.created_at,
      hidden: r.hidden,
    }))
  }

  const store: Store = {
    mode: 'supabase',

    createEvent: (input) =>
      rpc('create_event', {
        p_title: input.title,
        p_event_date: input.eventDate,
        p_shots: input.shotsPerGuest,
        p_reveal_at: input.revealAt,
        p_film: input.film,
        p_date_stamp: input.dateStamp,
      }),

    async getEvent(code) {
      const { data, error } = await sb.from('events').select('*').eq('code', code.toUpperCase()).maybeSingle()
      fail(error)
      if (!data) return null
      return {
        id: data.id,
        code: data.code,
        title: data.title,
        eventDate: data.event_date,
        shotsPerGuest: data.shots_per_guest,
        revealAt: data.reveal_at,
        film: data.film,
        dateStamp: data.date_stamp,
        createdAt: data.created_at,
      }
    },

    updateEvent: (code, hostKey, patch) =>
      rpc<EventInfo>('host_update_event', {
        p_code: code,
        p_key: hostKey,
        p_title: patch.title ?? null,
        p_shots: patch.shotsPerGuest ?? null,
        p_reveal_at: patch.revealAt ?? null,
        p_film: patch.film ?? null,
        p_date_stamp: patch.dateStamp ?? null,
      }),

    joinEvent: (code, name, deviceId) => rpc<Guest>('join_event', { p_code: code, p_name: name, p_device: deviceId }),

    getGuest: (code, deviceId) => rpc<Guest | null>('get_guest', { p_code: code, p_device: deviceId }),

    async uploadPhoto({ code, deviceId, photoId, blob }) {
      const event = await store.getEvent(code)
      if (!event) throw new Error('Event not found')
      const path = `${event.id}/${photoId}.jpg`
      const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      // A retry after a dropped connection may find the file already there — that's fine.
      if (error && !/exists|duplicate/i.test(error.message)) throw new Error(error.message)
      await rpc('add_photo', { p_code: code, p_device: deviceId, p_photo_id: photoId, p_path: path })
    },

    async listPhotos(code) {
      const event = await store.getEvent(code)
      if (!event) return []
      return toPhotos(event.id, await rpc<PhotoRow[]>('list_photos', { p_code: code }))
    },

    async hostListPhotos(code, hostKey) {
      const event = await store.getEvent(code)
      if (!event) throw new NotAuthorizedError()
      return toPhotos(event.id, await rpc<PhotoRow[]>('host_list_photos', { p_code: code, p_key: hostKey }))
    },

    hostSetHidden: (code, hostKey, photoId, hidden) =>
      rpc('host_set_hidden', { p_code: code, p_key: hostKey, p_photo_id: photoId, p_hidden: hidden }),

    hostDeletePhoto: (code, hostKey, photoId) =>
      rpc('host_delete_photo', { p_code: code, p_key: hostKey, p_photo_id: photoId }),

    hostStats: (code, hostKey) => rpc('host_stats', { p_code: code, p_key: hostKey }),
  }
  return store
}
