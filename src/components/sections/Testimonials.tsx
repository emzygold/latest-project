"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { testimonials } from "@/content/site";
import { Arrow } from "../ui/Button";
import { SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

function Stars() {
  return (
    <div className="flex gap-1 text-violet" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.25 + i * 0.07 }}
          aria-hidden
        >
          <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
        </motion.svg>
      ))}
    </div>
  );
}

/** Swipeable / draggable testimonial slider with autoplay */
export function Testimonials() {
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const n = testimonials.length;
  const go = (d: number) => setState(([i]) => [(i + d + n) % n, d]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setState(([i]) => [(i + 1) % n, 1]), 6500);
    return () => window.clearInterval(id);
  }, [paused, n]);

  const t = testimonials[index];

  return (
    <section className="container-x py-24 md:py-36" aria-labelledby="testimonials-heading">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal>
            <SectionLabel>Kind words</SectionLabel>
          </Reveal>
          <LineReveal
            as="h2"
            className="mt-6 font-display text-[clamp(44px,5.6vw,88px)] leading-[0.95] text-ink"
            lines={["What clients", <span key="b" className="text-purple">say</span>]}
          />
          <span id="testimonials-heading" className="sr-only">
            Testimonials
          </span>
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="grid h-14 w-14 place-items-center rounded-full ring-1 ring-ink/15 transition-all duration-300 hover:bg-ink hover:text-white active:scale-90"
            >
              <Arrow className="h-5 w-5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="grid h-14 w-14 place-items-center rounded-full bg-violet text-white transition-all duration-300 hover:bg-ink active:scale-90"
            >
              <Arrow className="h-5 w-5" />
            </button>
            <span className="ml-3 font-bold tabular-nums text-muted">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div
          className="relative lg:col-span-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          data-cursor="Drag"
        >
          <div className="relative min-h-[420px] overflow-hidden rounded-[32px] bg-mist p-7 md:min-h-[440px] md:p-14">
            <svg viewBox="0 0 64 48" className="absolute right-8 top-8 h-16 w-20 text-violet/15 md:h-24 md:w-32" fill="currentColor" aria-hidden>
              <path d="M0 48V28C0 12 8 2 24 0l3 6c-9 3-13 9-13 16h10v26zm36 0V28c0-16 8-26 24-28l3 6c-9 3-13 9-13 16h10v26z" />
            </svg>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.figure
                key={index}
                custom={dir}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80 || info.velocity.x < -400) go(1);
                  else if (info.offset.x > 80 || info.velocity.x > 400) go(-1);
                }}
                initial={{ opacity: 0, x: dir * 80, rotate: dir * 2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: dir * -80, rotate: dir * -2 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="relative flex h-full cursor-grab flex-col justify-between gap-10 active:cursor-grabbing"
              >
                <div>
                  <Stars />
                  <blockquote className="mt-8 text-[clamp(22px,2.6vw,36px)] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
                    “{t.quote}”
                  </blockquote>
                </div>
                <figcaption className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-ink font-display text-2xl text-lime">
                    {t.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold text-ink">{t.name}</span>
                    <span className="block text-muted">{t.role}</span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
          {/* progress dots */}
          <div className="mt-6 flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setState(([cur]) => [i, i > cur ? 1 : -1])}
                className="h-2 overflow-hidden rounded-full bg-line transition-all duration-500"
                style={{ width: i === index ? 48 : 16 }}
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="block h-full origin-left bg-violet"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: paused ? 1 : 1 }}
                    transition={{ duration: paused ? 0.3 : 6.5, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
