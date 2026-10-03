import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { store } from '../lib/store'
import type { EventInfo, Guest } from '../lib/types'
import { formatEventDate, getDeviceId, isRevealed } from '../lib/util'

export default function GuestWelcome() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventInfo | null | undefined>(undefined)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [ev, g] = await Promise.all([store.getEvent(code), store.getGuest(code, getDeviceId())])
      setEvent(ev)
      setGuest(g)
      if (g) setName(g.name)
    })().catch(() => setEvent(null))
  }, [code])

  if (event === undefined) return <Spinner label="Loading your camera…" />
  if (event === null)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="heading text-4xl">Event not found</h1>
        <p className="mt-3 text-ink-2">Double-check the QR code or ask the host for a new link.</p>
      </main>
    )

  const revealed = isRevealed(event.revealAt)
  const shotsLeft = event.shotsPerGuest - (guest?.shotsUsed ?? 0)

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await store.joinEvent(code, name.trim(), getDeviceId())
      navigate(`/e/${code}/camera`)
    } catch {
      setError("Couldn't connect. Check your internet and try again.")
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-primary text-night-ink">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-lift/50 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-gold">You&apos;re invited to shoot</p>
        <h1 className="heading mt-4 text-center text-5xl leading-tight">{event.title}</h1>
        <p className="mt-2 text-center text-night-ink/75">{formatEventDate(event.eventDate)}</p>

        <div className="mx-auto mt-8 flex items-center gap-3 rounded-full bg-primary-dark/70 px-5 py-2.5">
          <FilmIcon />
          <span className="text-sm">
            {guest ? (
              <>
                <strong className="font-mono text-gold">{Math.max(0, shotsLeft)}</strong> of {event.shotsPerGuest} shots left
              </>
            ) : (
              <>
                Your roll: <strong className="font-mono text-gold">{event.shotsPerGuest}</strong> shots
              </>
            )}
          </span>
        </div>

        {revealed && (
          <Link to={`/e/${code}/album`} className="btn-gold mt-8 py-4 text-base">
            ★ View the album
          </Link>
        )}

        {shotsLeft > 0 ? (
          <form onSubmit={join} className="mt-8 rounded-3xl bg-surface p-5 text-ink shadow-2xl">
            <label className="label" htmlFor="name">
              {guest ? 'Welcome back' : 'Your first name'}
            </label>
            <input
              id="name"
              className="input"
              placeholder="e.g. Tunde"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="given-name"
              required
            />
            <p className="mt-2 text-xs text-ink-2">Shown next to your photos in the shared album.</p>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <button type="submit" className="btn-primary mt-4 w-full py-4 text-base" disabled={busy || !name.trim()}>
              {busy ? 'Opening…' : guest ? 'Keep shooting' : 'Open the camera'}
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-2xl bg-primary-dark/70 p-5 text-center">
            You&apos;ve used your whole roll. Thank you! 🎞️
            {!revealed && <span className="mt-1 block text-sm text-night-ink/70">Come back when the photos develop.</span>}
          </p>
        )}

        {!revealed && (
          <Link to={`/e/${code}/album`} className="mt-6 text-center text-sm text-night-ink/70 underline underline-offset-4">
            When do photos develop?
          </Link>
        )}

        <ul className="mt-10 space-y-2 text-sm text-night-ink/80">
          <li>📸 No previews, just like film. Make each shot count.</li>
          <li>🌙 Photos develop and appear in the shared album later.</li>
          <li>🔒 No app or account needed.</li>
        </ul>
      </div>
    </main>
  )
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  )
}
