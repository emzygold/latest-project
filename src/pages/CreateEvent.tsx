import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { FILM_STYLES } from '../lib/film'
import { store } from '../lib/store'
import type { FilmStyle } from '../lib/types'
import { saveHostEvent, toLocalInput } from '../lib/util'

type RevealChoice = 'morning' | 'midnight' | 'live' | 'custom'

const REVEAL_OPTIONS: { id: RevealChoice; label: string; hint: string }[] = [
  { id: 'morning', label: 'Next morning', hint: '10:00 am the day after' },
  { id: 'midnight', label: 'End of the night', hint: '11:59 pm on the day' },
  { id: 'live', label: 'Live album', hint: 'Photos show up right away' },
  { id: 'custom', label: 'Pick a time', hint: 'Any date and time' },
]

function todayISO() {
  return toLocalInput(new Date().toISOString()).slice(0, 10)
}

function revealTime(choice: RevealChoice, eventDate: string, custom: string): string {
  const day = new Date(`${eventDate}T00:00:00`)
  if (choice === 'morning') {
    day.setDate(day.getDate() + 1)
    day.setHours(10, 0, 0, 0)
    return day.toISOString()
  }
  if (choice === 'midnight') {
    day.setHours(23, 59, 0, 0)
    return day.toISOString()
  }
  if (choice === 'live') return new Date().toISOString()
  return new Date(custom).toISOString()
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(todayISO())
  const [shots, setShots] = useState(25)
  const [reveal, setReveal] = useState<RevealChoice>('morning')
  const [customReveal, setCustomReveal] = useState('')
  const [film, setFilm] = useState<FilmStyle>('classic')
  const [dateStamp, setDateStamp] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (reveal === 'custom' && !customReveal) {
      setError('Pick a reveal date and time.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { event, hostKey } = await store.createEvent({
        title: title.trim(),
        eventDate,
        shotsPerGuest: shots,
        revealAt: revealTime(reveal, eventDate, customReveal),
        film,
        dateStamp,
      })
      saveHostEvent({ code: event.code, title: event.title, hostKey })
      navigate(`/host/${event.code}#key=${hostKey}`, { state: { justCreated: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
        <Logo />
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 className="heading text-4xl sm:text-5xl">Create your event</h1>
        <p className="mt-2 text-ink-2">Takes about a minute. You can change these later.</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <section className="card space-y-5 p-5 sm:p-6">
            <div>
              <label className="label" htmlFor="title">
                Event name
              </label>
              <input
                id="title"
                className="input"
                placeholder="Tunde & Amara's Wedding"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="date">
                Event date
              </label>
              <input
                id="date"
                type="date"
                className="input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="label" htmlFor="shots">
                  Shots per guest
                </label>
                <span className="font-mono text-lg font-semibold text-primary">{shots}</span>
              </div>
              <input
                id="shots"
                type="range"
                min={5}
                max={50}
                step={1}
                value={shots}
                onChange={(e) => setShots(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-sm text-ink-2">A real disposable camera has 27. Fewer shots = more thoughtful photos.</p>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="label">When do photos develop?</h2>
            <p className="-mt-1 mb-4 text-sm text-ink-2">Until then, guests can&apos;t see any photos (yours included).</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {REVEAL_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => setReveal(o.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    reveal === o.id ? 'border-primary bg-primary-tint' : 'border-line hover:border-ink-2/40'
                  }`}
                >
                  <p className="font-semibold">{o.label}</p>
                  <p className="text-sm text-ink-2">{o.hint}</p>
                </button>
              ))}
            </div>
            {reveal === 'custom' && (
              <input
                type="datetime-local"
                className="input mt-3"
                value={customReveal}
                onChange={(e) => setCustomReveal(e.target.value)}
                required
              />
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="label">Film style</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {FILM_STYLES.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setFilm(f.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    film === f.id ? 'border-primary ring-2 ring-primary-tint' : 'border-line hover:border-ink-2/40'
                  }`}
                >
                  <FilmSwatch film={f.id} />
                  <div className="p-3">
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-xs text-ink-2">{f.blurb}</p>
                  </div>
                </button>
              ))}
            </div>
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block font-medium">Orange date stamp</span>
                <span className="text-sm text-ink-2">The classic &apos;26 10 03 in the corner</span>
              </span>
              <input
                type="checkbox"
                checked={dateStamp}
                onChange={(e) => setDateStamp(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
            </label>
          </section>

          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}

          <button type="submit" className="btn-primary w-full py-4 text-base" disabled={busy || !title.trim()}>
            {busy ? 'Creating…' : 'Create event & get QR code'}
          </button>
        </form>
      </main>
    </div>
  )
}

function FilmSwatch({ film }: { film: FilmStyle }) {
  const bg =
    film === 'bw'
      ? 'linear-gradient(135deg,#2b2b2b,#9a9a9a 55%,#e6e6e6)'
      : film === 'golden'
        ? 'linear-gradient(135deg,#7a3b12,#e0902f 50%,#ffd98a)'
        : 'linear-gradient(135deg,#4a3a3c,#b07a5c 50%,#efd8bf)'
  return (
    <div className="relative h-16" style={{ background: bg }}>
      {film !== 'bw' && <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-orange-500/40 to-transparent" />}
    </div>
  )
}
