import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Spinner from '../components/Spinner'
import { capturePhoto, viewfinderAspect } from '../lib/film'
import { store } from '../lib/store'
import type { EventInfo, Guest } from '../lib/types'
import { enqueuePhoto, onPhotoUploaded, subscribeQueue, type QueueState } from '../lib/uploadQueue'
import { getDeviceId, isRevealed, uuid } from '../lib/util'

type Facing = 'environment' | 'user'
type CamStatus = 'starting' | 'ready' | 'denied' | 'unsupported' | 'error'

// Counts shots taken on this device, so the counter is right even before uploads finish.
function readTaken(code: string): number {
  try {
    return Number(localStorage.getItem(`fb:taken:${code}`) ?? 0)
  } catch {
    return 0
  }
}
function writeTaken(code: string, n: number) {
  try {
    localStorage.setItem(`fb:taken:${code}`, String(n))
  } catch {
    // ignore
  }
}

let audioCtx: AudioContext | null = null
function playShutter() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const len = Math.floor(ctx.sampleRate * 0.09)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Two quick clicks of filtered noise: the mirror flipping up and down.
    for (let i = 0; i < len; i++) {
      const t = i / len
      const env = Math.exp(-t * 18) + (t > 0.55 ? Math.exp(-(t - 0.55) * 30) * 0.6 : 0)
      data[i] = (Math.random() * 2 - 1) * env
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2400
    const gain = ctx.createGain()
    gain.gain.value = 0.5
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start()
  } catch {
    // Sound is a nice-to-have.
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Camera() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [taken, setTaken] = useState(() => readTaken(code))
  const [queue, setQueue] = useState<QueueState>({ pending: {}, failing: false, outOfFilm: false })

  const [facing, setFacing] = useState<Facing>('environment')
  const [status, setStatus] = useState<CamStatus>('starting')
  const [aspect, setAspect] = useState(3 / 4)
  const [flashOn, setFlashOn] = useState(false)
  const [torch, setTorch] = useState(false)
  const [busy, setBusy] = useState(false)
  const [screenFlash, setScreenFlash] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  const deviceId = getDeviceId()

  const loadGuest = useCallback(async () => {
    const g = await store.getGuest(code, deviceId)
    if (!g) {
      navigate(`/e/${code}`, { replace: true })
      return
    }
    setGuest(g)
  }, [code, deviceId, navigate])

  useEffect(() => {
    store.getEvent(code).then((ev) => (ev ? setEvent(ev) : navigate(`/e/${code}`, { replace: true })))
    void loadGuest()
    const unsubQueue = subscribeQueue(setQueue)
    const unsubUploaded = onPhotoUploaded((c) => c === code && void loadGuest())
    return () => {
      unsubQueue()
      unsubUploaded()
    }
  }, [code, loadGuest, navigate])

  const pending = queue.pending[code] ?? 0
  const total = event?.shotsPerGuest ?? 0
  const used = Math.max(taken, (guest?.shotsUsed ?? 0) + pending, queue.outOfFilm ? total : 0)
  const remaining = Math.max(0, total - used)
  // Camera runs only while the viewfinder is on screen (not while loading or after the roll is done).
  const cameraActive = Boolean(event && guest) && (remaining > 0 || busy)

  // Start (or restart) the camera whenever we switch lenses.
  useEffect(() => {
    if (!cameraActive) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    let cancelled = false
    setStatus('starting')
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
        setTorch(Boolean(caps.torch))
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
          setAspect(viewfinderAspect(video.videoWidth || 3, video.videoHeight || 4))
        }
        setStatus('ready')
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        setStatus(err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'denied' : 'error')
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, cameraActive])

  if (!event || !guest) return <Spinner label="Loading film…" dark />

  async function shoot() {
    const video = videoRef.current
    if (!video || busy || remaining <= 0 || status !== 'ready' || !event) return
    setBusy(true)
    navigator.vibrate?.(25)
    playShutter()
    const track = streamRef.current?.getVideoTracks()[0]
    try {
      if (flashOn && torch && track) {
        await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] })
        await wait(280)
      } else if (flashOn) {
        // Front camera or no torch: light the subject with a bright white screen.
        setScreenFlash(true)
        await wait(200)
      }
      const blob = await capturePhoto(video, { film: event.film, dateStamp: event.dateStamp })
      const next = used + 1
      setTaken(next)
      writeTaken(code, next)
      setFlashKey((k) => k + 1)
      await enqueuePhoto({ photoId: uuid(), code, deviceId, blob })
    } catch {
      alert('That shot didn’t save. Please try again.')
    } finally {
      if (flashOn && torch && track) {
        await track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => undefined)
      }
      setScreenFlash(false)
      // A short "winding the film" pause, so guests can't machine-gun their roll.
      await wait(700)
      setBusy(false)
    }
  }

  if (remaining <= 0 && !busy) {
    return <OutOfFilm code={code} event={event} pending={pending} failing={queue.failing} />
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-night text-night-ink select-none">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to={`/e/${code}`}
          aria-label="Leave camera"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-night-card text-xl"
        >
          ×
        </Link>
        <p className="heading max-w-[55%] truncate text-lg">{event.title}</p>
        <button
          onClick={() => setFlashOn((f) => !f)}
          aria-pressed={flashOn}
          aria-label={flashOn ? 'Flash on' : 'Flash off'}
          className={`flex h-10 w-10 items-center justify-center rounded-full ${flashOn ? 'bg-gold text-ink' : 'bg-night-card'}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={flashOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          className="relative max-h-full w-full overflow-hidden rounded-2xl bg-black ring-1 ring-night-card"
          style={{ aspectRatio: String(aspect), maxWidth: `calc((100dvh - 260px) * ${aspect})` }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <Brackets />
          {status !== 'ready' && <CameraStatus status={status} onRetry={() => location.reload()} />}
          {flashKey > 0 && <div key={flashKey} className="animate-flash pointer-events-none absolute inset-0 bg-white" />}
        </div>
      </div>

      <UploadNote pending={pending} failing={queue.failing} />

      <footer className="grid grid-cols-3 items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="justify-self-start">
          <div className="rounded-xl bg-night-card px-3 py-2 text-center">
            <div className="relative h-6 overflow-hidden font-mono text-2xl font-bold leading-none text-gold tabular-nums">
              {/* Film-counter wheel: the old number rolls up, the new one rolls in */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={remaining}
                  className="block"
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '-100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {remaining}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-night-ink/60">shots left</div>
          </div>
        </div>

        <button
          onClick={shoot}
          disabled={busy || status !== 'ready'}
          aria-label="Take photo"
          className="h-20 w-20 justify-self-center rounded-full border-4 border-gold p-1.5 transition active:scale-95 disabled:opacity-60"
        >
          <span className={`block h-full w-full rounded-full transition ${busy ? 'scale-90 bg-night-ink/60' : 'bg-night-ink'}`} />
        </button>

        <button
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          aria-label="Switch camera"
          className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-night-card"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
            <path d="M9.5 13a2.5 2.5 0 0 1 4.6-1.4M14.5 13a2.5 2.5 0 0 1-4.6 1.4" strokeLinecap="round" />
          </svg>
        </button>
      </footer>

      {screenFlash && <div className="fixed inset-0 z-50 bg-white" />}
    </main>
  )
}

function Brackets() {
  const c = 'absolute h-6 w-6 border-night-ink/70'
  return (
    <div className="pointer-events-none absolute inset-3">
      <span className={`${c} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${c} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${c} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${c} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  )
}

function CameraStatus({ status, onRetry }: { status: CamStatus; onRetry: () => void }) {
  const msg: Record<Exclude<CamStatus, 'ready'>, { title: string; body: string }> = {
    starting: { title: 'Loading film…', body: 'Allow camera access when your phone asks.' },
    denied: {
      title: 'Camera blocked',
      body: 'Tap the "aA" or lock icon in the address bar, allow Camera, then reload.',
    },
    unsupported: {
      title: 'Camera not available',
      body: 'Open this link in Safari or Chrome. Some in-app browsers (Instagram, WhatsApp) block the camera.',
    },
    error: { title: 'Camera didn’t start', body: 'Close other apps using the camera and try again.' },
  }
  const m = msg[status as Exclude<CamStatus, 'ready'>]
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-night-card p-6 text-center">
      <p className="heading text-2xl">{m.title}</p>
      <p className="mt-2 text-sm text-night-ink/70">{m.body}</p>
      {status !== 'starting' && (
        <button className="btn-night mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

function UploadNote({ pending, failing }: { pending: number; failing: boolean }) {
  if (!pending) return <div className="h-6" />
  return (
    <p className="flex h-6 items-center justify-center gap-2 text-xs text-night-ink/70">
      <span className={`h-2 w-2 rounded-full ${failing ? 'bg-warning' : 'animate-pulse bg-success'}`} />
      {failing
        ? `No connection. ${pending} photo${pending > 1 ? 's' : ''} saved, will send automatically`
        : `Sending ${pending} photo${pending > 1 ? 's' : ''} to the darkroom…`}
    </p>
  )
}

function OutOfFilm({ code, event, pending, failing }: { code: string; event: EventInfo; pending: number; failing: boolean }) {
  const revealed = isRevealed(event.revealAt)
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-center text-night-ink">
      <p className="text-6xl">🎞️</p>
      <h1 className="heading mt-6 text-5xl">That&apos;s a wrap!</h1>
      <p className="mt-3 max-w-xs text-night-ink/75">
        You used all {event.shotsPerGuest} shots. Thank you for capturing {event.title}.
      </p>
      {pending > 0 && (
        <p className="mt-6 rounded-xl bg-night-card px-4 py-3 text-sm">
          {failing ? '⚠️ Waiting for internet. ' : ''}Keep this page open: {pending} photo{pending > 1 ? 's are' : ' is'} still uploading.
        </p>
      )}
      <Link to={`/e/${code}/album`} className={`${revealed ? 'btn-gold' : 'btn-night'} mt-8`}>
        {revealed ? '★ View the album' : 'See when photos develop'}
      </Link>
    </main>
  )
}
