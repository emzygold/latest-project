"use client";

import { AnimatePresence, LayoutGroup, motion, useMotionValue, useSpring } from "motion/react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { projects } from "@/content/site";
import { TransitionLink } from "../providers/TransitionLink";
import { PageHeader } from "../sections/PageHeader";
import { Arrow } from "../ui/Button";
import { Reveal } from "../ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const filters = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

export function WorkIndex() {
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState<"list" | "grid">("list");
  const [hovered, setHovered] = useState<number | null>(null);

  const list = useMemo(() => (filter === "All" ? projects : projects.filter((p) => p.category === filter)), [filter]);

  // floating preview that trails the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 24, mass: 0.6 });
  const y = useSpring(my, { stiffness: 220, damping: 24, mass: 0.6 });

  return (
    <>
      <PageHeader
        label="Portfolio"
        count={projects.length}
        lines={["Selected", <span key="b" className="text-purple">work</span>]}
        intro="Booking platforms, reservation systems and premium websites, each built in Bubble.io with real API integrations."
      />

      <section className="container-x pb-24 md:pb-36" aria-label="Projects">
        {/* controls */}
        <Reveal className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <LayoutGroup id="filters">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter projects">
              {filters.map((f) => {
                const on = f === filter;
                const n = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(f)}
                    className={`relative rounded-full px-5 py-2.5 text-[15px] font-bold transition-colors duration-300 ${on ? "text-white" : "text-ink hover:text-purple"}`}
                  >
                    {on && (
                      <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                    )}
                    {!on && <span className="absolute inset-0 rounded-full ring-1 ring-line" />}
                    <span className="relative">
                      {f} <sup className="text-[10px] opacity-60">{n}</sup>
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <div className="hidden items-center gap-1 rounded-full bg-mist p-1 md:flex" role="group" aria-label="Layout">
            {(["list", "grid"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`relative rounded-full px-4 py-2 text-sm font-bold capitalize transition-colors ${view === v ? "text-white" : "text-ink"}`}
              >
                {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-violet" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{v}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* LIST VIEW (desktop) */}
        {view === "list" && (
          <div
            className="relative hidden md:block"
            onMouseMove={(e) => {
              mx.set(e.clientX);
              my.set(e.clientY);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <ul className="border-t border-line">
              <AnimatePresence mode="popLayout">
                {list.map((p) => {
                  const idx = projects.indexOf(p);
                  const on = hovered === idx;
                  const dim = hovered !== null && !on;
                  return (
                    <motion.li
                      key={p.slug}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="border-b border-line"
                      onMouseEnter={() => setHovered(idx)}
                    >
                      <TransitionLink href={`/work/${p.slug}`} label={p.title} data-cursor="View" className="group grid grid-cols-12 items-center gap-6 py-9 lg:py-11">
                        <span className={`col-span-1 font-display text-2xl transition-colors duration-500 ${on ? "text-purple" : "text-ink/30"}`}>0{idx + 1}</span>
                        <motion.h2
                          className={`col-span-6 font-display text-[clamp(40px,5.4vw,88px)] leading-[0.95] transition-colors duration-500 ${dim ? "text-ink/20" : "text-ink"}`}
                          animate={{ x: on ? 24 : 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                        >
                          {p.title}
                        </motion.h2>
                        <span className={`col-span-3 text-[15px] font-semibold transition-colors duration-500 ${dim ? "text-muted/40" : "text-muted"}`}>
                          {p.short}
                          <br />
                          <span className="text-purple">{p.category}</span>
                        </span>
                        <span className="col-span-2 flex items-center justify-end gap-4">
                          <span className={`text-sm font-bold transition-colors ${dim ? "text-ink/25" : "text-ink/60"}`}>{p.year}</span>
                          <span className={`grid h-14 w-14 place-items-center rounded-full transition-all duration-500 ${on ? "rotate-0 bg-violet text-white" : "-rotate-45 bg-mist text-ink"}`}>
                            <Arrow className="h-5 w-5" />
                          </span>
                        </span>
                      </TransitionLink>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            {/* trailing preview */}
            <motion.div className="pointer-events-none fixed left-0 top-0 z-40 hidden lg:block" style={{ x, y }} aria-hidden>
              <motion.div
                className="relative -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] shadow-[0_40px_80px_-30px_rgba(3,19,58,0.55)]"
                style={{ width: 420, height: 270 }}
                initial={false}
                animate={{ scale: hovered !== null ? 1 : 0, opacity: hovered !== null ? 1 : 0, rotate: hovered !== null ? -3 : 8 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                {projects.map((p, i) => (
                  <motion.div
                    key={p.slug}
                    className="absolute inset-0"
                    initial={false}
                    animate={{ y: hovered === i ? "0%" : hovered !== null && i < hovered ? "-100%" : "100%" }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    <Image src={p.image} alt="" fill sizes="420px" className="object-cover" />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* GRID VIEW (always on mobile) */}
        <div className={`grid gap-6 md:grid-cols-2 ${view === "list" ? "md:hidden" : ""}`}>
          <AnimatePresence mode="popLayout">
            {list.map((p) => {
              const idx = projects.indexOf(p);
              return (
                <motion.article
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={idx % 2 === 1 ? "md:mt-20" : ""}
                >
                  <TransitionLink href={`/work/${p.slug}`} label={p.title} data-cursor="View" className="group block">
                    <div className="relative aspect-[16/11] overflow-hidden rounded-[24px] bg-mist">
                      <Image
                        src={p.image}
                        alt={p.imageAlt}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-purple backdrop-blur">
                        {p.category}
                      </span>
                      <span className="absolute bottom-4 right-4 grid h-12 w-12 -rotate-45 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 group-hover:rotate-0">
                        <Arrow className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-display text-[clamp(32px,3.4vw,52px)] leading-[1] text-ink transition-colors group-hover:text-purple">{p.title}</h2>
                        <p className="mt-1 font-semibold text-muted">{p.short}</p>
                      </div>
                      <span className="mt-2 font-display text-xl text-ink/30">0{idx + 1}</span>
                    </div>
                  </TransitionLink>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
