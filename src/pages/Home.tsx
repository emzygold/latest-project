import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import Logo from '../components/Logo'
import Polaroid, { type SceneId } from '../components/Polaroid'
import { Counter, Cursor, EASE, FadeIn, Magnetic, Marquee, RevealText, ScrollWords } from '../components/motion'
import { store } from '../lib/store'
import { getSavedHostEvents } from '../lib/util'

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <Cursor />
      <Nav />
      <Hero />
      <Bands />
      <Statement />
      <HowItWorks />
      <Numbers />
      <FilmStyles />
      <Features />
      <MyEvents />
      <FinalCta />
      <Footer />
    </div>
  )
}

/* ───────────────────────── Nav ───────────────────────── */

function Nav() {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 200)
    setScrolled(y > 40)
  })
  return (
    <motion.header
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-5"
      animate={{ y: hidden ? -110 : 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <nav
        className={`mx-auto flex max-w-5xl items-center justify-between rounded-full py-2 pl-4 pr-2 transition-all duration-500 ${
          scrolled ? 'border border-line/80 bg-surface/80 shadow-lg shadow-ink/5 backdrop-blur-xl' : 'border border-transparent'
        }`}
      >
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          {[
            ['How it works', '#how'],
            ['Film styles', '#film'],
            ['Features', '#features'],
          ].map(([label, href]) => (
            <a key={href} href={href} className="group relative transition hover:text-ink">
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-primary transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
            </a>
          ))}
        </div>
        <Link to="/create" className="btn-primary px-5 py-2.5">
          Create event
        </Link>
      </nav>
    </motion.header>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

const HERO_SHOTS: { scene: SceneId; caption: string; className: string; rotate: number; depth: number }[] = [
  { scene: 'dance', caption: 'first dance', className: 'left-[2%] top-[8%] w-[46%] md:left-[58%] md:top-[14%] md:w-[19%]', rotate: -8, depth: 1.2 },
  { scene: 'gele', caption: "aunty's gele 👑", className: 'right-[2%] top-[2%] w-[44%] md:right-[3%] md:top-[30%] md:w-[17%]', rotate: 7, depth: 0.7 },
  { scene: 'toast', caption: 'to forever', className: 'left-[24%] top-[34%] w-[48%] md:left-[66%] md:top-[50%] md:w-[18%]', rotate: -3, depth: 1.6 },
  { scene: 'cake', caption: 'the cake!!', className: 'hidden md:block md:left-[50%] md:top-[56%] md:w-[13%]', rotate: 10, depth: 0.5 },
]

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, 160])
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      ref={ref}
      className="relative min-h-dvh overflow-hidden pt-28 sm:pt-32"
      onPointerMove={(e) => {
        mx.set(e.clientX / window.innerWidth - 0.5)
        my.set(e.clientY / window.innerHeight - 0.5)
      }}
    >
      {/* soft burgundy glow */}
      <div className="pointer-events-none absolute -left-40 top-20 h-[32rem] w-[32rem] rounded-full bg-primary-tint blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 md:max-w-[62%]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            The digital disposable camera
          </motion.p>

          <h1 className="heading mt-6 text-[clamp(3.2rem,9.5vw,8.5rem)] leading-[0.88] tracking-[-0.03em]">
            <RevealText text="Every guest." className="block" delay={0.1} />
            <RevealText text="Every angle." className="block" delay={0.25} />
            <RevealText text="One album." className="block italic text-primary" delay={0.4} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
            className="mt-7 max-w-md text-lg text-ink-2"
          >
            Guests scan a QR code, shoot on a retro film camera right in their browser, and wake up to one shared
            album full of moments you would have missed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link to="/create" className="btn-primary group px-8 py-4 text-base" data-cursor="Start">
                Create your event
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="#how" className="btn-secondary px-8 py-4 text-base">
                See how it works
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>
      </div>

      {/* Scattered polaroids: tossed onto the "table", then drift with the mouse and the scroll */}
      <div className="relative mt-12 h-[26rem] md:absolute md:inset-0 md:mt-0 md:h-auto">
        {HERO_SHOTS.map((p, i) => (
          <HeroPolaroid key={p.scene} {...p} index={i} mx={mx} my={my} progress={scrollYProgress} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-ink-2 md:flex"
      >
        Scroll
        <span className="relative h-10 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-primary"
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  )
}

function HeroPolaroid({
  scene,
  caption,
  className,
  rotate,
  depth,
  index,
  mx,
  my,
  progress,
}: (typeof HERO_SHOTS)[number] & {
  index: number
  mx: MotionValue<number>
  my: MotionValue<number>
  progress: MotionValue<number>
}) {
  const sx = useSpring(useTransform(mx, (v) => v * depth * 50), { stiffness: 80, damping: 20 })
  const sy = useSpring(useTransform(my, (v) => v * depth * 40), { stiffness: 80, damping: 20 })
  const scrollY = useTransform(progress, [0, 1], [0, -260 * depth])
  const y = useTransform([sy, scrollY] as MotionValue<number>[], ([a, b]) => (a as number) + (b as number))

  return (
    <motion.div className={`absolute ${className}`} style={{ x: sx, y }}>
      <motion.div
        initial={{ opacity: 0, y: -260, rotate: rotate * 4, scale: 1.25 }}
        animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
        transition={{ type: 'spring', stiffness: 70, damping: 13, delay: 0.5 + index * 0.18 }}
        whileHover={{ rotate: 0, scale: 1.06, zIndex: 20, transition: { duration: 0.35 } }}
        data-cursor="Snap"
      >
        <Polaroid scene={scene} caption={caption} />
      </motion.div>
    </motion.div>
  )
}

/* ───────────────────────── Marquee bands ───────────────────────── */

const OCCASIONS = ['Weddings', 'Owambes', 'Birthdays', 'Engagements', 'Naming ceremonies', 'Galas', 'Graduations', 'Anniversaries']

function Bands() {
  return (
    <section className="relative z-10 -my-6 py-16" aria-label="Made for every occasion">
      <div className="-rotate-2 scale-105 bg-primary py-5 text-night-ink shadow-xl">
        <Marquee baseVelocity={-1.6}>
          {OCCASIONS.map((o) => (
            <span key={o} className="heading flex items-center gap-8 px-4 text-4xl italic sm:text-6xl">
              {o}
              <span className="text-2xl not-italic text-gold sm:text-3xl">✦</span>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="-mt-3 rotate-[1.5deg] scale-105 bg-gold py-3 text-ink">
        <Marquee baseVelocity={1.2}>
          {['No app download', '25 shots each', 'Photos develop overnight', 'One shared album', 'Works on any phone'].map((t) => (
            <span key={t} className="flex items-center gap-6 px-3 text-sm font-semibold uppercase tracking-[0.25em] sm:text-base">
              {t}
              <span>●</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}

/* ───────────────────────── Statement ───────────────────────── */

function Statement() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 sm:px-8 sm:py-40">
      <FadeIn>
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-primary">( The idea )</p>
      </FadeIn>
      <ScrollWords
        className="heading text-[clamp(2rem,5.2vw,4.6rem)] leading-[1.05] tracking-[-0.02em]"
        text="Stop buying eighty-three disposable cameras. Print *one *QR *code. Your guests already carry the best cameras in the room. FlashBack just *gives *them *film."
      />
    </section>
  )
}

/* ───────────────────────── How it works (sticky stacking cards) ───────────────────────── */

const STEPS = [
  {
    n: '01',
    title: 'Set the table',
    body: 'Create your event in a minute. Choose shots per guest, a film style and when photos develop. Print elegant QR table cards.',
    tone: 'bg-surface text-ink border border-line',
    art: <TableCardArt />,
  },
  {
    n: '02',
    title: 'Guests shoot on film',
    body: 'A scan opens a retro camera right in the browser. No app, no sign-up. No previews either, so every shot counts.',
    tone: 'bg-primary text-night-ink',
    art: <PhoneArt />,
  },
  {
    n: '03',
    title: 'Wake up to the album',
    body: 'At the reveal time, hundreds of photos from every angle appear at once. Browse by guest, save favourites, download everything.',
    tone: 'bg-night text-night-ink',
    art: <AlbumArt />,
  },
]

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-10 px-4 pb-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <RevealText as="h2" text="How it works" className="heading block text-[clamp(2.8rem,7vw,6rem)] leading-none tracking-[-0.03em]" />
          <FadeIn className="max-w-xs text-ink-2">Three steps. About a minute of setup. A lifetime of photos.</FadeIn>
        </div>
        <div className="relative">
          {STEPS.map((s, i) => (
            <StackCard key={s.n} index={i} total={STEPS.length} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StackCard({
  n,
  title,
  body,
  tone,
  art,
  index,
  total,
}: (typeof STEPS)[number] & { index: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - (total - index) * 0.04])
  const dim = useTransform(scrollYProgress, [0, 1], [0, index === total - 1 ? 0 : 0.25])

  return (
    <div ref={ref} className="sticky h-[34rem] sm:h-[30rem]" style={{ top: `calc(6rem + ${index * 1.75}rem)` }}>
      <motion.article
        style={{ scale }}
        className={`relative grid h-full origin-top grid-rows-[auto_1fr] overflow-hidden rounded-[2rem] p-7 sm:grid-cols-2 sm:grid-rows-1 sm:p-12 ${tone}`}
      >
        <div className="flex flex-col">
          <span className="font-mono text-sm text-gold">( {n} )</span>
          <h3 className="heading mt-4 text-4xl leading-none sm:text-6xl">{title}</h3>
          <p className="mt-5 max-w-sm opacity-75 sm:text-lg">{body}</p>
        </div>
        <div className="relative mt-6 flex items-center justify-center sm:mt-0">{art}</div>
        <motion.div style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-night" />
      </motion.article>
    </div>
  )
}

function TableCardArt() {
  return (
    <motion.div
      whileInView={{ rotate: [-6, -2, -6] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="w-48 rounded-2xl border border-line bg-page p-5 text-center shadow-2xl sm:w-56"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-gold">Be our photographer</p>
      <p className="heading mt-2 text-xl text-primary">Tunde &amp; Amara</p>
      <div className="mx-auto mt-3 grid w-28 grid-cols-7 gap-0.5 rounded-lg border-2 border-primary p-1.5">
        {Array.from({ length: 49 }, (_, i) => (
          <span key={i} className={`aspect-square ${[0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44, 24, 26, 32, 40, 46, 22, 38].includes(i) ? 'bg-ink' : ''}`} />
        ))}
      </div>
      <p className="heading mt-3 text-base italic">Scan to open the camera</p>
    </motion.div>
  )
}

function PhoneArt() {
  return (
    <div className="relative h-72 w-40 rounded-[2rem] border-4 border-night-card bg-night p-2 shadow-2xl sm:h-80 sm:w-44">
      <div className="h-full overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#4F0B11,#2A1A1C)]">
        <div className="mx-3 mt-8 aspect-[3/4] overflow-hidden rounded-lg">
          <Polaroid scene="floor" caption="" className="!p-0 [&_figcaption]:hidden" />
        </div>
        <div className="mt-5 flex items-center justify-between px-4">
          <span className="rounded-md bg-night-card px-1.5 py-1 font-mono text-xs text-gold">24</span>
          <motion.span
            className="h-11 w-11 rounded-full border-[3px] border-gold bg-night-ink"
            animate={{ scale: [1, 0.86, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1 }}
          />
          <span className="h-6 w-6 rounded-full bg-night-card" />
        </div>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-2 rounded-[1.5rem] bg-white"
        animate={{ opacity: [0, 0, 0.9, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.6, 0.8] }}
      />
    </div>
  )
}

function AlbumArt() {
  const scenes: SceneId[] = ['dance', 'gele', 'cake', 'toast', 'confetti', 'floor']
  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-1.5">
      {scenes.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, filter: 'brightness(0) sepia(1)' }}
          whileInView={{ opacity: 1, filter: 'brightness(1) sepia(0)' }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: i * 0.18 }}
        >
          <Polaroid scene={s} caption="" stamp="" className="!p-0 [&_figcaption]:hidden" />
        </motion.div>
      ))}
    </div>
  )
}

/* ───────────────────────── Numbers ───────────────────────── */

function Numbers() {
  const stats = [
    { to: 25, suffix: '', label: 'shots per guest, like a real roll of film' },
    { to: 0, suffix: '', label: 'apps to download. It opens in the browser' },
    { to: 60, suffix: 's', label: 'to create an event and print the QR cards' },
    { to: 1, suffix: '', label: 'shared album with every angle of your day' },
  ]
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn
            key={s.label}
            delay={i * 0.08}
            className={`border-line p-6 sm:p-10 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}
          >
            <Counter to={s.to} suffix={s.suffix} className="heading block text-6xl text-primary sm:text-7xl" />
            <p className="mt-3 text-sm text-ink-2">{s.label}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── Film styles (interactive) ───────────────────────── */

const FILMS = [
  { id: 'classic', name: 'Classic 35mm', note: 'Warm, faded, a touch of grain', filter: 'sepia(0.35) saturate(1.1) contrast(1.05)' },
  { id: 'golden', name: 'Golden Hour', note: 'Rich, sunny, extra warm', filter: 'sepia(0.55) saturate(1.6) hue-rotate(-12deg) brightness(1.05)' },
  { id: 'bw', name: 'Black & White', note: 'Timeless, high contrast', filter: 'grayscale(1) contrast(1.25)' },
]

function FilmStyles() {
  const [active, setActive] = useState(0)
  const film = FILMS[active]
  return (
    <section id="film" className="scroll-mt-10 bg-night py-24 text-night-ink sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-8 md:grid-cols-2">
        <div>
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">( Pick your film )</p>
          </FadeIn>
          <RevealText as="h2" text="Three looks. Zero editing." className="heading mt-4 block text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]" />
          <ul className="mt-10 border-t border-night-card">
            {FILMS.map((f, i) => (
              <li key={f.id}>
                <button
                  onClick={() => setActive(i)}
                  onPointerEnter={() => setActive(i)}
                  className="group flex w-full items-center justify-between border-b border-night-card py-5 text-left"
                >
                  <span>
                    <span className={`heading block text-3xl transition-colors sm:text-4xl ${i === active ? 'text-night-ink' : 'text-night-ink/35'}`}>
                      {f.name}
                    </span>
                    <span className="text-sm text-night-ink/55">{f.note}</span>
                  </span>
                  <motion.span
                    animate={{ rotate: i === active ? 0 : -45, opacity: i === active ? 1 : 0.3 }}
                    className="text-2xl text-gold"
                  >
                    →
                  </motion.span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={film.id}
              initial={{ opacity: 0, rotate: 8, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, rotate: -3, y: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -14, x: -80, scale: 0.9 }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ filter: film.filter }}
            >
              <Polaroid scene="gele" caption={film.name.toLowerCase()} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Features (spotlight cards) ───────────────────────── */

const FEATURES = [
  { icon: '📶', title: 'Works on bad network', body: 'Photos save on the phone first and upload when the signal returns. Nothing gets lost.' },
  { icon: '🔒', title: 'No cheating the roll', body: 'The shot limit is checked on the server, so clearing the browser won’t buy extra film.' },
  { icon: '⏳', title: 'The big reveal', body: 'A darkroom countdown builds suspense, then the whole album appears at once.' },
  { icon: '🛡️', title: 'You stay in control', body: 'See every photo first. Hide or delete anything before guests do.' },
  { icon: '⬇️', title: 'Download everything', body: 'One tap zips every photo, named by guest, ready for your photographer or album printer.' },
  { icon: '🖨️', title: 'Print-ready table cards', body: 'Elegant A6 cards with your names and QR code, four to a sheet.' },
]

function Features() {
  return (
    <section id="features" className="scroll-mt-10 px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <RevealText as="h2" text="Built for the real party." className="heading block max-w-3xl text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]" />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={(i % 3) * 0.1}>
              <SpotlightCard>
                <span className="text-3xl">{f.icon}</span>
                <h3 className="heading mt-6 text-2xl">{f.title}</h3>
                <p className="mt-2 text-ink-2">{f.body}</p>
              </SpotlightCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function SpotlightCard({ children }: { children: ReactNode }) {
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const bg = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgba(111,16,24,0.10), transparent 70%)`
  return (
    <motion.div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - r.left)
        y.set(e.clientY - r.top)
      }}
      onPointerLeave={() => {
        x.set(-200)
        y.set(-200)
      }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="card relative h-full overflow-hidden p-7 transition-colors hover:border-primary/40"
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

/* ───────────────────────── Saved events ───────────────────────── */

function MyEvents() {
  const events = getSavedHostEvents()
  if (!events.length) return null
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
      <h2 className="heading text-3xl">Your events</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {events.map((e) => (
          <li key={e.code}>
            <Link to={`/host/${e.code}`} className="card flex items-center justify-between p-5 transition hover:border-primary" data-cursor="Open">
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
  )
}

/* ───────────────────────── Final CTA + footer ───────────────────────── */

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-primary px-4 py-28 text-center text-night-ink sm:py-40">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_50%_120%,#C9A24A,transparent_55%)]" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-gold">( Your turn )</p>
      <RevealText as="h2" text="Say cheese." className="heading relative mt-4 block text-[clamp(4rem,15vw,13rem)] italic leading-[0.85] tracking-[-0.04em]" />
      <FadeIn delay={0.3} className="relative mt-12 flex justify-center">
        <Magnetic strength={0.5}>
          <Link
            to="/create"
            data-cursor="Go"
            className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gold text-center font-semibold text-ink shadow-2xl transition-transform hover:scale-105 sm:h-48 sm:w-48"
          >
            Create your
            <br />
            event →
          </Link>
        </Magnetic>
      </FadeIn>
    </section>
  )
}

function Footer() {
  return (
    <footer className="overflow-hidden bg-night pt-14 text-night-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-4 sm:px-8">
        <p className="max-w-xs text-night-ink/60">Made for weddings, owambes, birthdays and every party worth remembering.</p>
        <div className="flex gap-6 text-sm text-night-ink/70">
          <a href="#how" className="hover:text-gold">How it works</a>
          <a href="#film" className="hover:text-gold">Film styles</a>
          <Link to="/create" className="hover:text-gold">Create event</Link>
        </div>
      </div>
      {store.mode === 'local' && (
        <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-night-ink/40 sm:px-8">
          Demo mode: events and photos are saved in this browser only. Connect Supabase (see README) for shared albums.
        </p>
      )}
      <motion.p
        initial={{ y: '40%' }}
        whileInView={{ y: '18%' }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        className="heading mt-10 select-none text-center text-[22vw] leading-none tracking-[-0.05em] text-night-card"
        aria-hidden
      >
        FlashBack
      </motion.p>
    </footer>
  )
}
