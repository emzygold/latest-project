"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReady } from "../providers/AppProvider";

/* ------------------------------------------------------------------ */
/* Section label: ● Selected Work                                      */
/* ------------------------------------------------------------------ */
export function SectionLabel({ children, dark = false, className = "" }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.16em] ${
        dark ? "bg-white/8 text-white/80 ring-1 ring-white/15" : "bg-lilac text-purple"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-lime" : "bg-purple"}`} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Magnetic wrapper                                                    */
/* ------------------------------------------------------------------ */
export function Magnetic({ children, strength = 0.35, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 200, damping: 14, mass: 0.5 });
  const y = useSpring(my, { stiffness: 200, damping: 14, mass: 0.5 });
  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Velocity marquee: speeds up and flips direction with scrolling      */
/* ------------------------------------------------------------------ */
function wrap(min: number, max: number, v: number) {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
}

export function VelocityMarquee({
  children,
  baseVelocity = -2,
  className = "",
}: {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
}) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  const direction = useRef(1);
  const hovered = useRef(false);

  useAnimationFrame((_, delta) => {
    const slow = hovered.current ? 0.25 : 1;
    let moveBy = direction.current * baseVelocity * (delta / 1000) * slow;
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    moveBy += direction.current * moveBy * Math.abs(vf);
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      className={`flex overflow-hidden whitespace-nowrap ${className}`}
      onMouseEnter={() => (hovered.current = true)}
      onMouseLeave={() => (hovered.current = false)}
    >
      <motion.div className="flex shrink-0 flex-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex shrink-0 items-center" aria-hidden={i > 0 || undefined}>
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Count-up number                                                     */
/* ------------------------------------------------------------------ */
export function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const ready = useReady();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || !ready) return;
    const c = animate(0, value, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, ready, value]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {n}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll-linked word highlight                                        */
/* ------------------------------------------------------------------ */
function Word({
  children,
  progress,
  range,
  className = "",
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  className?: string;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [6, 0]);
  return (
    <span className="relative mr-[0.25em] inline-block">
      <motion.span style={{ opacity, y }} className={`inline-block ${className}`}>
        {children}
      </motion.span>
    </span>
  );
}

export function ScrollWords({ text, className = "", highlight = [] }: { text: string; className?: string; highlight?: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        const clean = w.replace(/[.,!?—]/g, "");
        const hl = highlight.includes(clean);
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]} className={hl ? "text-purple" : ""}>
            {w}
          </Word>
        );
      })}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Live local time                                                     */
/* ------------------------------------------------------------------ */
export function LocalTime({ timeZone, className = "" }: { timeZone: string; className?: string }) {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone });
    const tick = () => setT(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timeZone]);
  return (
    <span className={`tabular-nums ${className}`} suppressHydrationWarning>
      {t || "--:--:--"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Copy email with a toast                                             */
/* ------------------------------------------------------------------ */
export function CopyEmail({ email, className = "", children }: { email: string; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={copy} className={className} data-cursor="Copy">
        {children ?? email}
      </button>
      <AnimatePresence>
        {copied && (
          <motion.span
            role="status"
            className="pointer-events-none absolute -top-11 left-1/2 z-10 whitespace-nowrap rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink shadow-lg"
            initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.8 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -6, x: "-50%", scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            Email copied ✓
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="border-t border-line">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className="border-b border-line">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="group flex w-full items-center justify-between gap-6 py-6 text-left md:py-7"
            >
              <span className="text-lg font-bold transition-colors duration-300 group-hover:text-purple md:text-2xl">{it.q}</span>
              <span
                className={`relative grid h-11 w-11 flex-none place-items-center rounded-full transition-colors duration-500 ${
                  isOpen ? "bg-violet text-white" : "bg-mist text-ink group-hover:bg-lilac"
                }`}
              >
                <motion.svg viewBox="0 0 24 24" className="h-4 w-4" animate={{ rotate: isOpen ? 135 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                  <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </motion.svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-7 text-[17px] leading-relaxed text-muted md:text-lg">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
