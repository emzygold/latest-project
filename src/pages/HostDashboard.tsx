import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import JSZip from 'jszip'
import Logo from '../components/Logo'
import Lightbox from '../components/Lightbox'
import { useQrDataUrl } from '../components/QrCode'
import Spinner from '../components/Spinner'
import { FILM_STYLES } from '../lib/film'
import { store } from '../lib/store'
import { NotAuthorizedError, type EventInfo, type EventStats, type Photo } from '../lib/types'
import {
  downloadBlob,
  formatEventDate,
  getHostKey,
  guestUrl,
  hostUrl,
  isRevealed,
  saveHostEvent,
  toLocalInput,
} from '../lib/util'

const REFRESH_MS = 15_000

export default function HostDashboard() {
  const { code = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated)

  const [hostKey] = useState(() => new URLSearchParams(location.hash.slice(1)).get('key') ?? getHostKey(code))
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [stats, setStats] = useState<EventStats>({ guests: 0, photos: 0 })
  const [photos, setPhotos] = useState<Photo[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'denied'>('loading')
  const [lightbox, setLightbox] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!hostKey) return
    const [s, p] = await Promise.all([store.hostStats(code, hostKey), store.hostListPhotos(code, hostKey)])
    setStats(s)
    setPhotos(p)
  }, [code, hostKey])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const ev = await store.getEvent(code)
      if (!alive) return
      if (!ev) return setState('missing')
      if (!hostKey) return setState('denied')
      setEvent(ev)
      try {
        await refresh()
        saveHostEvent({ code: ev.code, title: ev.title, hostKey })
        // Keep the secret key out of the address bar once it's saved.
        if (location.hash) navigate(location.pathname, { replace: true, state: location.state })
        setState('ready')
      } catch (err) {
        setState(err instanceof NotAuthorizedError ? 'denied' : 'missing')
      }
    })()
    return () => {
      alive = false
    }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state !== 'ready') return
    const id = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(id)
  }, [state, refresh])

  if (state === 'loading') return <Spinner label="Opening your event…" />
  if (state === 'missing') return <Message title="Event not found" body={`No event with code ${code}.`} />
  if (state === 'denied' || !event || !hostKey)
    return (
      <Message
        title="Host access needed"
        body="This page is for the event host. Open the private host link you saved when you created the event."
        action={{ to: `/e/${code}`, label: 'Open as a guest instead' }}
      />
    )

  async function update(patch: Parameters<typeof store.updateEvent>[2]) {
    setEvent(await store.updateEvent(code, hostKey!, patch))
  }

  async function toggleHidden(p: Photo) {
    await store.hostSetHidden(code, hostKey!, p.id, !p.hidden)
    await refresh()
  }

  async function remove(p: Photo) {
    if (!confirm(`Delete this photo by ${p.guestName}? This can't be undone.`)) return
    await store.hostDeletePhoto(code, hostKey!, p.id)
    setLightbox(null)
    await refresh()
  }

  return (
    <div className="min-h-dvh pb-20">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to={`/e/${code}/album`} className="text-sm font-semibold text-primary">
          Guest album →
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-ink-2">Host dashboard</p>
          <h1 className="heading mt-1 text-4xl sm:text-5xl">{event.title}</h1>
          <p className="mt-1 text-ink-2">{formatEventDate(event.eventDate)}</p>
        </div>

        {justCreated && <SaveLinkBanner link={hostUrl(code, hostKey)} />}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <ShareCard code={code} />
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Guests" value={stats.guests} />
              <Stat label="Photos" value={stats.photos} />
              <Stat
                label="Album"
                value={isRevealed(event.revealAt) ? 'Revealed' : 'Developing'}
                accent={isRevealed(event.revealAt)}
                className="col-span-2 sm:col-span-1"
              />
            </div>
            <SettingsCard event={event} onUpdate={update} />
          </div>
        </div>

        <PhotosSection
          photos={photos}
          title={event.title}
          onOpen={setLightbox}
          onToggleHidden={toggleHidden}
          onDelete={remove}
        />
      </main>

      {lightbox !== null && (
        <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

function Message({ title, body, action }: { title: string; body: string; action?: { to: string; label: string } }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="heading text-4xl">{title}</h1>
      <p className="mt-3 text-ink-2">{body}</p>
      {action && (
        <Link to={action.to} className="btn-secondary mt-8">
          {action.label}
        </Link>
      )}
    </main>
  )
}

function useCopy(): [string | null, (text: string, id: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, id: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }
  return [copied, copy]
}

function SaveLinkBanner({ link }: { link: string }) {
  const [copied, copy] = useCopy()
  return (
    <div className="rounded-2xl border border-gold/60 bg-surface p-5">
      <p className="font-semibold">🔑 Save your private host link</p>
      <p className="mt-1 text-sm text-ink-2">
        This link is the only way to manage this event from another device. Keep it secret and don&apos;t print it.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button className="btn-primary shrink-0" onClick={() => copy(link, 'host')}>
          {copied === 'host' ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}

function ShareCard({ code }: { code: string }) {
  const link = guestUrl(code)
  const qr = useQrDataUrl(link, 1000)
  const [copied, copy] = useCopy()

  return (
    <section className="card p-5">
      <h2 className="heading text-2xl">Guest QR code</h2>
      <p className="text-sm text-ink-2">Guests scan this to open the camera.</p>
      <div className="mt-4 rounded-xl border border-line p-3">
        {qr ? <img src={qr} alt="Guest QR code" className="w-full" /> : <div className="aspect-square animate-pulse bg-line" />}
      </div>
      <p className="mt-3 text-center font-mono text-sm tracking-[0.3em] text-ink-2">{code}</p>
      <div className="mt-4 grid gap-2">
        <Link to={`/host/${code}/cards`} className="btn-primary">
          Print table cards
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-secondary px-3"
            disabled={!qr}
            onClick={async () => qr && downloadBlob(await (await fetch(qr)).blob(), `flashback-${code}-qr.png`)}
          >
            Download QR
          </button>
          <button className="btn-secondary px-3" onClick={() => copy(link, 'guest')}>
            {copied === 'guest' ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  accent = false,
  className = '',
}: {
  label: string
  value: string | number
  accent?: boolean
  className?: string
}) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className={`heading mt-1 text-3xl ${accent ? 'text-success' : ''}`}>{value}</p>
    </div>
  )
}

function SettingsCard({
  event,
  onUpdate,
}: {
  event: EventInfo
  onUpdate: (patch: Parameters<typeof store.updateEvent>[2]) => Promise<void>
}) {
  const revealed = isRevealed(event.revealAt)
  const [shots, setShots] = useState(event.shotsPerGuest)
  const [revealAt, setRevealAt] = useState(toLocalInput(event.revealAt))
  const [saving, setSaving] = useState(false)
  const dirty = shots !== event.shotsPerGuest || revealAt !== toLocalInput(event.revealAt)

  async function run(patch: Parameters<typeof store.updateEvent>[2]) {
    setSaving(true)
    try {
      await onUpdate(patch)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="heading text-2xl">Settings</h2>
          <p className="text-sm text-ink-2">
            {FILM_STYLES.find((f) => f.id === event.film)?.name} film
            {event.dateStamp ? ' · date stamp on' : ''}
          </p>
        </div>
        {!revealed && (
          <button
            className="btn-gold"
            disabled={saving}
            onClick={() => {
              if (confirm('Reveal the album to all guests now?')) {
                const now = new Date().toISOString()
                setRevealAt(toLocalInput(now))
                void run({ revealAt: now })
              }
            }}
          >
            Reveal album now
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="shots">
            Shots per guest
          </label>
          <input
            id="shots"
            type="number"
            min={1}
            max={100}
            className="input"
            value={shots}
            onChange={(e) => setShots(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          />
        </div>
        <div>
          <label className="label" htmlFor="reveal">
            Photos develop at
          </label>
          <input
            id="reveal"
            type="datetime-local"
            className="input"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
          />
        </div>
      </div>
      {dirty && (
        <button
          className="btn-primary mt-4"
          disabled={saving || !revealAt}
          onClick={() => run({ shotsPerGuest: shots, revealAt: new Date(revealAt).toISOString() })}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </section>
  )
}

function PhotosSection({
  photos,
  title,
  onOpen,
  onToggleHidden,
  onDelete,
}: {
  photos: Photo[]
  title: string
  onOpen: (i: number) => void
  onToggleHidden: (p: Photo) => void
  onDelete: (p: Photo) => void
}) {
  const [zipProgress, setZipProgress] = useState<number | null>(null)

  async function downloadAll() {
    const visible = photos.filter((p) => !p.hidden)
    if (!visible.length) return
    setZipProgress(0)
    try {
      const zip = new JSZip()
      let done = 0
      for (const p of visible) {
        const blob = await fetch(p.url).then((r) => r.blob())
        const name = `${String(done + 1).padStart(3, '0')}-${p.guestName.replace(/\W+/g, '-')}.jpg`
        zip.file(name, blob)
        done += 1
        setZipProgress(Math.round((done / visible.length) * 100))
      }
      const out = await zip.generateAsync({ type: 'blob' })
      await downloadBlob(out, `${title.replace(/\W+/g, '-')}-photos.zip`)
    } finally {
      setZipProgress(null)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading text-2xl">All photos</h2>
          <p className="text-sm text-ink-2">You can see every photo, even before the reveal. Hidden photos stay out of the guest album.</p>
        </div>
        <button className="btn-gold" onClick={downloadAll} disabled={zipProgress !== null || photos.length === 0}>
          {zipProgress === null ? '★ Download all' : `Zipping… ${zipProgress}%`}
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line py-14 text-center text-ink-2">
          No photos yet. They&apos;ll appear here as guests start shooting.
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-line">
              <button className="h-full w-full" onClick={() => onOpen(i)} aria-label={`Open photo by ${p.guestName}`}>
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className={`h-full w-full object-cover transition ${p.hidden ? 'opacity-30 grayscale' : ''}`}
                />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent p-2 pt-6 text-xs font-medium text-night-ink">
                {p.guestName}
                {p.hidden && <span className="ml-1 rounded bg-warning px-1 text-[10px] text-ink">HIDDEN</span>}
              </div>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  className="rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-ink shadow"
                  onClick={() => onToggleHidden(p)}
                >
                  {p.hidden ? 'Show' : 'Hide'}
                </button>
                <button
                  className="rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white shadow"
                  onClick={() => onDelete(p)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
