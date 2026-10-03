"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import type { Project } from "@/content/site";
import { useReady } from "../providers/AppProvider";
import { TransitionLink } from "../providers/TransitionLink";
import { Arrow, Button } from "../ui/Button";
import { SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div className="fixed inset-x-0 top-0 z-[85] h-1 origin-left bg-violet" style={{ scaleX }} aria-hidden />;
}

function HeroImage({ p }: { p: Project }) {
  const ready = useReady();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0.3, 1], [1, 1.15]);
  const y = useTransform(scrollYProgress, [0, 1], ["-4%", "8%"]);
  return (
    <div ref={ref} className="container-x">
      <motion.div
        className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-ink md:aspect-[16/8.5] md:rounded-[36px]"
        initial={{ clipPath: "inset(18% 10% 0% 10% round 36px)" }}
        animate={ready ? { clipPath: "inset(0% 0% 0% 0% round 36px)" } : undefined}
        transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1], delay: 0.35 }}
      >
        <motion.div className="absolute inset-0" style={{ scale, y }}>
          <Image src={p.image} alt={p.imageAlt} fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function DetailShot({ d, image, i }: { d: Project["details"][number]; image: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [i ? 60 : 30, i ? -60 : -30]);
  return (
    <motion.figure ref={ref} style={{ y }} className={i === 1 ? "md:mt-32" : ""}>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[24px] bg-mist" data-cursor="Zoom">
        <div
          className="absolute inset-0 bg-no-repeat transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
          style={{ backgroundImage: `url(${image})`, backgroundSize: `${d.zoom * 100}%`, backgroundPosition: d.position }}
          role="img"
          aria-label={d.caption}
        />
      </div>
      <figcaption className="mt-4 flex items-start gap-3 text-[15px] font-semibold text-muted">
        <span className="mt-2 h-1.5 w-6 flex-none rounded-full bg-violet" />
        {d.caption}
      </figcaption>
    </motion.figure>
  );
}

function NextProject({ p }: { p: Project }) {
  return (
    <section className="container-x pb-24 md:pb-36" aria-label="Next project">
      <TransitionLink
        href={`/work/${p.slug}`}
        label={p.title}
        data-cursor="Next"
        className="group relative block overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-white md:px-14 md:py-24"
      >
        <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
          <Image src={p.image} alt="" fill sizes="100vw" className="scale-110 object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100" />
          <div className="absolute inset-0 bg-ink/70" />
        </div>
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-lime">Next project</p>
            <h2 className="mt-4 font-display text-[clamp(48px,8vw,130px)] leading-[0.92] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-4">
              {p.title}
            </h2>
            <p className="mt-3 text-lg text-white/70">{p.short}</p>
          </div>
          <span className="grid h-20 w-20 flex-none -rotate-45 place-items-center rounded-full bg-lime text-ink transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110 md:h-28 md:w-28">
            <Arrow className="h-8 w-8" />
          </span>
        </div>
      </TransitionLink>
    </section>
  );
}

export function CaseStudy({ p, next, index }: { p: Project; next: Project; index: number }) {
  const ready = useReady();
  const meta = [
    { k: "Client", v: p.client },
    { k: "Date", v: p.date },
    { k: "Platform", v: p.platform },
    { k: "Role", v: p.role },
  ];

  return (
    <article>
      <ProgressBar />

      {/* header */}
      <header className="container-x pb-12 pt-[calc(var(--nav-h)+40px)] md:pb-16 md:pt-[calc(var(--nav-h)+70px)]">
        <motion.div
          className="flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <TransitionLink href="/work" label="Work" className="group inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-bold text-ink hover:bg-ink hover:text-white">
            <Arrow className="h-4 w-4 rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />
            All work
          </TransitionLink>
          <SectionLabel>
            Case study 0{index + 1} · {p.category}
          </SectionLabel>
        </motion.div>

        <LineReveal
          as="h1"
          immediate
          delay={0.1}
          className="mt-8 font-display text-[clamp(52px,10vw,170px)] leading-[0.9] text-ink"
          lines={[p.title]}
        />
        <motion.p
          className="mt-4 font-display text-[clamp(26px,3.6vw,56px)] leading-[1.05] text-purple"
          initial={{ opacity: 0, y: 24 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
        >
          {p.short}
        </motion.p>

        <motion.div
          className="mt-12 grid gap-8 border-t border-line pt-8 md:grid-cols-12"
          initial={{ opacity: 0, y: 20 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1, ease: EASE, delay: 0.45 }}
        >
          <dl className="grid grid-cols-2 gap-6 md:col-span-8 md:grid-cols-4">
            {meta.map((m) => (
              <div key={m.k}>
                <dt className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{m.k}</dt>
                <dd className="mt-2 font-bold leading-snug text-ink">{m.v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-start gap-3 md:col-span-4 md:justify-end">
            <Button href={p.live} external variant="purple" diagonal>
              Visit live site
            </Button>
          </div>
        </motion.div>
      </header>

      <HeroImage p={p} />

      {/* overview */}
      <section className="container-x py-24 md:py-36">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>Overview</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-8">
            <Reveal>
              <p className="text-[clamp(22px,2.4vw,36px)] font-bold leading-[1.35] tracking-[-0.01em] text-ink">{p.description}</p>
            </Reveal>
            <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-2">
              {p.stack.map((s) => (
                <span key={s} className="rounded-full bg-lilac px-4 py-2 text-sm font-bold text-purple">
                  {s}
                </span>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* challenge / solution */}
      <section className="container-x pb-24 md:pb-36">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal className="h-full">
            <div className="h-full rounded-[28px] bg-mist p-8 md:p-12">
              <p className="font-display text-[64px] leading-none text-ink/10">01</p>
              <h2 className="mt-2 font-display text-[clamp(36px,3.6vw,56px)] leading-[1] text-ink">The challenge</h2>
              <p className="mt-6 text-lg leading-relaxed text-muted">{p.challenge}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="h-full">
            <div className="h-full rounded-[28px] bg-ink p-8 text-white md:p-12">
              <p className="font-display text-[64px] leading-none text-white/10">02</p>
              <h2 className="mt-2 font-display text-[clamp(36px,3.6vw,56px)] leading-[1] text-lime">The solution</h2>
              <p className="mt-6 text-lg leading-relaxed text-white/75">{p.solution}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* features */}
      <section className="container-x pb-24 md:pb-36" aria-labelledby="features-h">
        <div className="mb-12 md:mb-16">
          <Reveal>
            <SectionLabel>What I built</SectionLabel>
          </Reveal>
          <LineReveal as="h2" className="mt-6 font-display text-[clamp(44px,6vw,96px)] leading-[0.95] text-ink" lines={["Key", <span key="b" className="text-purple">features</span>]} />
          <span id="features-h" className="sr-only">
            Key features
          </span>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[28px] bg-line ring-1 ring-line md:grid-cols-2 lg:grid-cols-3">
          {p.features.map((f, i) => (
            <li key={f.title} className="group relative bg-paper p-7 transition-colors duration-500 hover:bg-violet md:p-9">
              <Reveal delay={(i % 3) * 0.06}>
                <span className="font-display text-3xl text-purple transition-colors duration-500 group-hover:text-lime">0{i + 1}</span>
                <h3 className="mt-6 text-xl font-extrabold text-ink transition-colors duration-500 group-hover:text-white">{f.title}</h3>
                <p className="mt-2 text-muted transition-colors duration-500 group-hover:text-white/75">{f.body}</p>
              </Reveal>
            </li>
          ))}
          <li className="relative hidden bg-lime p-9 lg:flex lg:flex-col lg:justify-between">
            <p className="font-display text-3xl text-ink">Need something similar?</p>
            <div>
              <Button href="/contact" variant="dark" size="sm">
                Let’s talk
              </Button>
            </div>
          </li>
        </ol>
      </section>

      {/* details */}
      <section className="container-x pb-24 md:pb-40" aria-label="Design details">
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          {p.details.map((d, i) => (
            <DetailShot key={d.caption} d={d} image={p.image} i={i} />
          ))}
        </div>
      </section>

      {/* outcome */}
      <section className="container-x pb-24 md:pb-36">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[32px] bg-violet px-7 py-16 text-white md:px-16 md:py-24">
            <div className="dot-grid-light pointer-events-none absolute inset-0" />
            <p className="relative text-sm font-extrabold uppercase tracking-[0.18em] text-lime">The outcome</p>
            <p className="relative mt-6 max-w-4xl text-[clamp(26px,3.4vw,52px)] font-extrabold leading-[1.18] tracking-[-0.02em]">{p.outcome}</p>
            <div className="relative mt-10 flex flex-wrap gap-3">
              <Button href={p.live} external variant="lime" diagonal>
                {`Visit ${p.liveLabel}`}
              </Button>
              <Button href="/contact" variant="outline-light">
                Start a similar project
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <NextProject p={next} />
    </article>
  );
}
