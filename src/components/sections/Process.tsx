"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { process } from "@/content/site";
import { SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

function StepCard({ s, i }: { s: (typeof process)[number]; i: number }) {
  const colors = ["bg-lilac", "bg-ink text-white", "bg-violet text-white", "bg-lime"];
  return (
    <article
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] p-7 md:p-10 ${colors[i % colors.length]}`}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-[88px] leading-[0.8] opacity-90 md:text-[120px]">{s.step}</span>
        <span className="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] ring-1 ring-current/20">
          Step {i + 1}/{process.length}
        </span>
      </div>
      <div className="mt-10">
        <h3 className="font-display text-[40px] leading-[1] md:text-[52px]">{s.title}</h3>
        <p className="mt-4 max-w-md text-[17px] leading-relaxed opacity-80">{s.body}</p>
        <ul className="mt-7 flex flex-wrap gap-2">
          {s.points.map((p) => (
            <li key={p} className="rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ring-current/25">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function Process() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);
  const bar = useTransform(smooth, [0, 1], [0, 1]);

  const heading = (
    <div className="container-x">
      <Reveal>
        <SectionLabel>How I work</SectionLabel>
      </Reveal>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <LineReveal
          as="h2"
          className="font-display text-[clamp(44px,7vw,110px)] leading-[0.95] text-ink"
          lines={["From idea", <span key="b" className="text-purple">to launch</span>]}
        />
        <Reveal delay={0.1} className="max-w-sm text-lg text-muted">
          A simple, transparent process. You always know what’s happening, what’s next, and when it ships.
        </Reveal>
      </div>
    </div>
  );

  return (
    <section aria-label="Process">
      {/* Desktop: pinned horizontal scroll */}
      <div ref={wrap} className="relative hidden lg:block" style={{ height: `calc(100vh + ${distance}px)` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center gap-12 overflow-hidden pt-[var(--nav-h)]">
          {heading}
          <motion.div ref={track} style={{ x }} className="flex w-max gap-6 pl-[var(--gutter)] pr-[var(--gutter)]">
            {process.map((s, i) => (
              <div key={s.step} className="h-[min(52vh,500px)] w-[min(520px,38vw)] flex-none">
                <StepCard s={s} i={i} />
              </div>
            ))}
          </motion.div>
          <div className="container-x">
            <div className="h-[3px] overflow-hidden rounded-full bg-line">
              <motion.div className="h-full origin-left rounded-full bg-violet" style={{ scaleX: bar }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / tablet: stacked */}
      <div className="py-20 md:py-28 lg:hidden">
        {heading}
        <div className="container-x mt-12 grid gap-5 md:grid-cols-2">
          {process.map((s, i) => (
            <Reveal key={s.step} delay={(i % 2) * 0.08}>
              <StepCard s={s} i={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
