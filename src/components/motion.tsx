import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
  type MotionValue,
} from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const

/** Headline that rises word by word from behind a mask. */
export function RevealText({
  text,
  className = '',
  delay = 0,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  delay?: number
  as?: 'span' | 'h1' | 'h2' | 'p'
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const MotionTag = motion[Tag]
  return (
    <MotionTag ref={ref as never} className={className} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 4 }}
            animate={inView ? { y: '0%', rotate: 0 } : undefined}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
          >
            {word}
            {' '}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}

/** Generic fade + rise when scrolled into view. */
export function FadeIn({
  children,
  className = '',
  delay = 0,
  y = 30,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Endless strip that speeds up (and reverses) with scroll velocity. */
export function Marquee({ children, baseVelocity = -2, className = '' }: { children: ReactNode; baseVelocity?: number; className?: string }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 })
  const factor = useTransform(velocity, [0, 1000], [0, 4], { clamp: false })
  const direction = useRef(1)
  const pos = useTransform(x, (v) => `${wrap(-50, 0, v)}%`)

  useAnimationFrame((_, delta) => {
    if (reduce) return
    let move = direction.current * baseVelocity * (delta / 1000)
    if (factor.get() < 0) direction.current = -1
    else if (factor.get() > 0) direction.current = 1
    move += direction.current * move * factor.get()
    x.set(x.get() + move)
  })

  return (
    <div className={`flex overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div className="flex shrink-0" style={{ x: pos }}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

/** Paragraph whose words light up one by one as you scroll through it. */
export function ScrollWords({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] })
  const words = text.split(' ')
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  )
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1])
  const highlight = children.startsWith('*')
  return (
    <motion.span style={{ opacity }} className={`inline-block ${highlight ? 'italic text-gold' : ''}`}>
      {highlight ? children.slice(1) : children}
      {' '}
    </motion.span>
  )
}

/** Pulls its child toward the cursor, then springs back. */
export function Magnetic({ children, strength = 0.35, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 200, damping: 15, mass: 0.4 })
  const y = useSpring(0, { stiffness: 200, damping: 15, mass: 0.4 })
  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/** Number that counts up the first time it scrolls into view. */
export function Counter({ to, suffix = '', className = '' }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, { duration: 1.8, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [inView, to])
  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  )
}

/**
 * Desktop-only custom cursor: a small dot that grows into a labelled disc
 * over anything marked with data-cursor="Label".
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)
  const x = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.5 })
  const y = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.5 })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)
    let last: { x: number; y: number } | null = null
    const check = (target: Element | null) => {
      const el = target?.closest<HTMLElement>('[data-cursor], a, button')
      setHovering(Boolean(el))
      setLabel(el?.dataset.cursor ?? null)
    }
    const move = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY }
      x.set(e.clientX)
      y.set(e.clientY)
      check(e.target as Element)
    }
    // Scrolling moves content under a still mouse, so re-check what's beneath it.
    const scroll = () => last && check(document.elementFromPoint(last.x, last.y))
    window.addEventListener('pointermove', move)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', scroll)
    }
  }, [x, y])

  if (!enabled) return null
  const size = label ? 88 : hovering ? 44 : 12
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-wider text-ink mix-blend-normal"
      style={{ x, y, translateX: '-50%', translateY: '-50%' }}
      animate={{
        width: size,
        height: size,
        backgroundColor: label ? 'rgba(201,162,74,1)' : hovering ? 'rgba(201,162,74,0.25)' : 'rgba(111,16,24,1)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {label}
    </motion.div>
  )
}
