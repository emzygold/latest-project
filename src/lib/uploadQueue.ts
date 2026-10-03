import { createStore, del, entries, set } from 'idb-keyval'
import { store } from './store'
import { OutOfFilmError } from './types'

/*
  Photos are saved to IndexedDB first, then uploaded in the background.
  If the venue Wi-Fi or mobile data drops, nothing is lost: we keep retrying
  (and pick up again next time the page opens).
*/

interface QueueItem {
  photoId: string
  code: string
  deviceId: string
  blob: Blob
  createdAt: number
}

export interface QueueState {
  pending: Record<string, number> // per event code
  failing: boolean
  outOfFilm: boolean
}

const db = createStore('flashback-queue', 'uploads')
let state: QueueState = { pending: {}, failing: false, outOfFilm: false }
const listeners = new Set<(s: QueueState) => void>()
const uploadedListeners = new Set<(code: string) => void>()
let running = false
let retryTimer: ReturnType<typeof setTimeout> | null = null
let backoff = 2000

function emit(patch: Partial<QueueState>) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn(state))
}

async function refreshCounts() {
  const pending: Record<string, number> = {}
  for (const [, item] of await entries<string, QueueItem>(db)) {
    pending[item.code] = (pending[item.code] ?? 0) + 1
  }
  emit({ pending })
}

async function run() {
  if (running) return
  running = true
  try {
    const items = (await entries<string, QueueItem>(db)).map(([, v]) => v).sort((a, b) => a.createdAt - b.createdAt)
    for (const item of items) {
      try {
        await store.uploadPhoto(item)
        await del(item.photoId, db)
        backoff = 2000
        emit({ failing: false })
        uploadedListeners.forEach((fn) => fn(item.code))
      } catch (err) {
        if (err instanceof OutOfFilmError) {
          await del(item.photoId, db)
          emit({ outOfFilm: true })
          continue
        }
        emit({ failing: true })
        scheduleRetry()
        break
      } finally {
        await refreshCounts()
      }
    }
  } finally {
    running = false
  }
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = null
    void run()
  }, backoff)
  backoff = Math.min(backoff * 2, 60_000)
}

export async function enqueuePhoto(item: Omit<QueueItem, 'createdAt'>) {
  await set(item.photoId, { ...item, createdAt: Date.now() }, db)
  await refreshCounts()
  void run()
}

export function subscribeQueue(fn: (s: QueueState) => void): () => void {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

export function onPhotoUploaded(fn: (code: string) => void): () => void {
  uploadedListeners.add(fn)
  return () => uploadedListeners.delete(fn)
}

export function startQueue() {
  window.addEventListener('online', () => {
    backoff = 2000
    void run()
  })
  void refreshCounts().then(run)
}
