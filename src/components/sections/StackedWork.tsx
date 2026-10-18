"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import { projects, type Project } from "@/content/site";
import { TransitionLink } from "../providers/TransitionLink";
import { Button } from "../ui/Button";
import { SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

function Card({
  p,
  i,
  total,
  progress,
}: {
  p: Project;
  i: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const target = 1 - (total - 1 - i) * 0.05;
  const scale = useTransform(progress, [i / total, 1], [1, target]);
  const dim = useTransform(progress, [i / total, 1], [0, (total - 1 - i) * 0.18]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: local } = useScroll({ target: cardRef, offset: ["start end", "start start"] });
  const imgScale = useTransform(local, [0, 1], [1.25, 1]);

  return (
    <div
      ref={cardRef}
      className="sticky flex items-start justify-center"
      style={{ top: `calc(var(--nav-h) + ${i * 26}px)` }}
    >
      <motion.article
        style={{ scale, transformOrigin: "top center" }}
        className="relative w-full overflow-hidden rounded-[28px] bg-ink text-white shadow-[0_-20px_60px_-30px_rgba(3,19,58,0.5)] md:rounded-[36px]"
      >
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-40 blur-[110px]"
          style={{ background: p.accent }}
        />
        <div className="relative grid gap-8 p-5 md:p-8 lg:min-h-[min(72vh,680px)] lg:grid-cols-12 lg:gap-10 lg:p-12">
          <div className="order-2 flex flex-col justify-between gap-8 lg:order-1 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between text-sm font-bold text-white/60">
                <span className="font-display text-[44px] leading-none text-lime md:text-[56px]">0{i + 1}</span>
                <span className="rounded-full px-3 py-1 ring-1 ring-white/20">{p.category}</span>
              </div>
              <TransitionLink href={`/work/${p.slug}`} label={p.title} className="group mt-6 block">
                <h3 className="font-display text-[clamp(36px,4.4vw,72px)] leading-[0.98] transition-colors duration-300 group-hover:text-lime">
                  {p.title}
                </h3>
              </TransitionLink>
              <p className="mt-3 text-lg font-semibold text-white/75">{p.short}</p>
              <p className="mt-5 line-clamp-4 max-w-md text-[16px] leading-relaxed text-white/60">{p.description}</p>
            </div>
            <div>
              <ul className="mb-7 flex flex-wrap gap-2">
                {p.stack.map((s) => (
                  <li key={s} className="rounded-full bg-white/8 px-3.5 py-1.5 text-[13px] font-semibold text-white/80 ring-1 ring-white/10">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4">
                <Button href={`/work/${p.slug}`} variant="lime">
                  View case study
                </Button>
                <span className="text-sm font-semibold text-white/50">{p.date}</span>
              </div>
            </div>
          </div>

          <TransitionLink
            href={`/work/${p.slug}`}
            label={p.title}
            data-cursor="View"
            className="group relative order-1 block aspect-[16/10] overflow-hidden rounded-[20px] lg:order-2 lg:col-span-7 lg:aspect-auto"
            aria-label={`View ${p.title} case study`}
          >
            <motion.div className="absolute inset-0" style={{ scale: imgScale }}>
              <Image
                src={p.image}
                alt={p.imageAlt}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </TransitionLink>
        </div>
        <motion.div className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: dim }} />
      </motion.article>
    </div>
  );
}

export function StackedWork() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section className="container-x relative py-20 md:py-28" aria-labelledby="work-heading">
      <div className="mb-14 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal>
            <SectionLabel>Selected work</SectionLabel>
          </Reveal>
          <LineReveal
            as="h2"
            className="mt-6 font-display text-[clamp(44px,7vw,110px)] leading-[0.95] text-ink"
            lines={[
              "Projects I’ve",
              <span key="b" className="text-purple">
                built & shipped
              </span>,
            ]}
          />
          <span id="work-heading" className="sr-only">
            Selected work
          </span>
        </div>
        <Reveal delay={0.15} className="max-w-sm">
          <p className="mb-6 text-lg text-muted">
            Booking platforms, reservation systems and premium websites, each one built in Bubble.io with real API integrations.
          </p>
          <Button href="/work" variant="outline">
            All projects
          </Button>
        </Reveal>
      </div>

      <div ref={ref} className="relative flex flex-col gap-[10vh]">
        {projects.map((p, i) => (
          <Card key={p.slug} p={p} i={i} total={projects.length} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
