import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { store } from '../lib/store'
import { getSavedHostEvents } from '../lib/util'

const STEPS = [
  {
    n: '01',
    title: 'Place QR cards on every table',
    body: 'Create your event in a minute and print elegant table cards. No disposable cameras to buy.',
  },
  {
    n: '02',
    title: 'Guests scan and shoot',
    body: 'A retro camera opens right in the browser. No app download, no sign-up. Every guest gets a roll of film.',
  },
  {
    n: '03',
    title: 'Photos develop overnight',
    body: 'No previews, just like film. At the reveal time, everyone sees the whole shared album at once.',
  },
]

export default function Home() {
  const myEvents = getSavedHostEvents()

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to="/create" className="btn-primary px-5 py-2.5">
          Create event
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="grid items-center gap-10 py-10 sm:py-16 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> The digital disposable camera
            </p>
            <h1 className="heading mt-5 text-5xl leading-[1.05] sm:text-6xl">
              See your day through <em className="text-primary">every guest&apos;s</em> eyes.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-2">
              Guests scan a QR code, snap up to 25 film-style shots, and wake up to one shared album with hundreds of
              moments you would have missed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/create" className="btn-primary px-7 py-3.5 text-base">
                Create your event
              </Link>
              <a href="#how" className="btn-secondary px-7 py-3.5 text-base">
                How it works
              </a>
            </div>
          </div>

          <CameraIllustration />
        </section>

        {myEvents.length > 0 && (
          <section className="mb-14">
            <h2 className="heading text-2xl">Your events</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {myEvents.map((e) => (
                <li key={e.code}>
                  <Link
                    to={`/host/${e.code}`}
                    className="card flex items-center justify-between p-4 transition hover:border-primary"
                  >
                    <div>
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-sm text-ink-2">Code {e.code}</p>
                    </div>
                    <span className="text-primary">Manage →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="how" className="scroll-mt-6 border-t border-line py-14">
          <h2 className="heading text-4xl">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-6">
                <p className="font-mono text-sm font-semibold text-gold">{s.n}</p>
                <h3 className="heading mt-3 text-2xl">{s.title}</h3>
                <p className="mt-2 text-ink-2">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {store.mode === 'local' && (
          <p className="mb-10 rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
            <strong className="text-ink">Demo mode:</strong> events and photos are saved in this browser only. Connect
            Supabase (see README) so every guest&apos;s photos land in one shared album.
          </p>
        )}
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-2">
        Made for weddings, owambes, birthdays and every party worth remembering.
      </footer>
    </div>
  )
}

function CameraIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary-tint" />
      <div className="rounded-[2rem] bg-primary p-5 shadow-2xl shadow-primary/30">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 rounded bg-primary-dark" />
          <div className="flex items-center gap-2 rounded-full bg-primary-dark px-3 py-1 font-mono text-sm text-gold">
            <span className="h-2 w-2 rounded-full bg-gold" /> 25
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-night">
            <div className="h-20 w-20 rounded-full border-4 border-night-card bg-[radial-gradient(circle_at_35%_35%,#4a3a3c,#1A0F10_70%)] ring-4 ring-gold/70" />
          </div>
          <div className="flex flex-col justify-between">
            <div className="h-10 w-10 rounded-lg bg-night-ink/90" />
            <div className="h-12 w-12 rounded-full bg-gold shadow-inner" />
          </div>
        </div>
        <p className="mt-4 text-center font-serif text-lg italic text-night-ink/90">Tunde &amp; Amara · 2026</p>
      </div>
    </div>
  )
}
