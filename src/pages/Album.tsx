import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Countdown from '../components/Countdown'
import Lightbox from '../components/Lightbox'
import Logo from '../components/Logo'
import Spinner from '../components/Spinner'
import { store } from '../lib/store'
import type { EventInfo, Photo } from '../lib/types'
import { formatEventDate, isRevealed } from '../lib/util'

const POLL_MS = 20_000

export default function Album() {
  const { code = '' } = useParams()
  const [event, setEvent] = useState<EventInfo | null | undefined>(undefined)
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(async () => {
    const ev = await store.getEvent(code)
    setEvent(ev)
    if (!ev) return
    const isOpen = isRevealed(ev.revealAt)
    setRevealed(isOpen)
    if (isOpen) setPhotos(await store.listPhotos(code))
  }, [code])

  useEffect(() => {
    void load()
    // Keep checking: new photos keep arriving, and the host may reveal early.
    const id = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const guests = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const p of photos ?? []) {
      const g = counts.get(p.guestId) ?? { name: p.guestName, count: 0 }
      g.count += 1
      counts.set(p.guestId, g)
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [photos])

  const shown = useMemo(() => (photos ?? []).filter((p) => !filter || p.guestId === filter), [photos, filter])

  if (event === undefined) return <Spinner label="Opening the album…" dark />
  if (event === null)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-night px-6 text-center text-night-ink">
        <h1 className="heading text-4xl">Album not found</h1>
      </main>
    )

  if (!revealed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-center text-night-ink">
        <div className="animate-develop mx-auto flex h-28 w-24 items-end justify-center rounded-sm bg-[linear-gradient(160deg,#4a2a2e,#1A0F10)] p-2 pb-6 shadow-2xl ring-8 ring-night-ink/90">
          <span className="text-2xl">🎞️</span>
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-gold">In the darkroom</p>
        <h1 className="heading mt-3 text-4xl sm:text-5xl">{event.title}</h1>
        <p className="mt-3 max-w-sm text-night-ink/75">
          Photos are developing. The whole album appears at once on{' '}
          {new Date(event.revealAt).toLocaleString([], {
            weekday: 'long',
            hour: 'numeric',
            minute: '2-digit',
          })}
          .
        </p>
        <div className="mt-8">
          <Countdown target={event.revealAt} onDone={() => void load()} />
        </div>
        <Link to={`/e/${code}`} className="btn-night mt-10">
          Back to the camera
        </Link>
      </main>
    )
  }

  return (
    <div className="min-h-dvh bg-night text-night-ink">
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo light />
          <Link to={`/e/${code}`} className="text-sm font-semibold text-gold">
            Camera →
          </Link>
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.35em] text-gold">The album</p>
        <h1 className="heading mt-2 text-5xl">{event.title}</h1>
        <p className="mt-2 text-night-ink/70">
          {formatEventDate(event.eventDate)} · {photos?.length ?? 0} photos by {guests.length} guests
        </p>

        {guests.length > 1 && (
          <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={!filter} onClick={() => setFilter(null)}>
              Everyone
            </Chip>
            {guests.map(([id, g]) => (
              <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
                {g.name} <span className="opacity-60">{g.count}</span>
              </Chip>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-1 pb-16 sm:px-6">
        {photos === null ? (
          <Spinner label="Developing…" dark />
        ) : shown.length === 0 ? (
          <p className="py-20 text-center text-night-ink/60">No photos yet. Check back soon.</p>
        ) : (
          <div className="columns-2 gap-1 sm:columns-3 lg:columns-4">
            {shown.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setOpen(i)}
                className="mb-1 block w-full overflow-hidden rounded-sm bg-night-card"
                aria-label={`Open photo by ${p.guestName}`}
              >
                <img src={p.url} alt="" loading="lazy" className="w-full transition duration-300 hover:scale-[1.02]" />
              </button>
            ))}
          </div>
        )}
      </main>

      {open !== null && <Lightbox photos={shown} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-primary-lift text-white' : 'bg-night-card text-night-ink/80 hover:text-night-ink'
      }`}
    >
      {children}
    </button>
  )
}
