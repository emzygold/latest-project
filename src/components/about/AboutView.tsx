"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useRef, useState, type MouseEvent } from "react";
import { experience, site, stats, tools } from "@/content/site";
import { useReady } from "../providers/AppProvider";
import { PageHeader } from "../sections/PageHeader";
import { Button } from "../ui/Button";
import { CountUp, ScrollWords, SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

/* Portrait card that tilts toward the pointer */
function TiltPortrait() {
  const ready = useReady();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const onMove = (e: MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -y * 10, ry: x * 12 });
  };
  return (
    <div className="relative [perspective:1200px]">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[32px] bg-violet shadow-[0_50px_100px_-50px_rgba(91,26,235,0.7)] [transform-style:preserve-3d]"
        data-cursor="Hello"
      >
        <motion.div
          className="absolute inset-[-10%]"
          style={{ y: imgY }}
          initial={{ clipPath: "inset(100% 0 0 0)", scale: 1.25 }}
          animate={ready ? { clipPath: "inset(0% 0 0 0)", scale: 1 } : undefined}
          transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
        >
          <Image src="/images/george-portrait.webp" alt={`Portrait of ${site.name}`} fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
        </motion.div>
      </motion.div>
      {/* rotating sticker */}
      <motion.div
        className="absolute -bottom-8 -left-6 grid h-32 w-32 place-items-center rounded-full bg-lime md:-left-10 md:h-36 md:w-36"
        initial={{ scale: 0, rotate: -120 }}
        animate={ready ? { scale: 1, rotate: 0 } : undefined}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 1 }}
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
          <defs>
            <path id="about-circle" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
          </defs>
          <text className="fill-ink text-[17px] font-extrabold tracking-[0.18em]">
            <textPath href="#about-circle">BUBBLE.IO DEVELOPER • NIGERIA • </textPath>
          </text>
        </svg>
        <span className="text-3xl" aria-hidden>
          ✦
        </span>
      </motion.div>
    </div>
  );
}

function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} className="relative">
      <div className="absolute bottom-2 left-[11px] top-2 w-[2px] bg-line md:left-[15px]" />
      <motion.div className="absolute bottom-2 left-[11px] top-2 w-[2px] origin-top bg-violet md:left-[15px]" style={{ scaleY: line }} />
      <ol className="space-y-14">
        {experience.map((e, i) => (
          <Reveal key={e.role} delay={i * 0.05}>
            <li className="relative grid gap-3 pl-12 md:grid-cols-12 md:gap-8 md:pl-16">
              <span className="absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full bg-paper ring-2 ring-violet md:h-8 md:w-8">
                <span className="h-2.5 w-2.5 rounded-full bg-violet" />
              </span>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-purple md:col-span-3 md:pt-1.5">{e.period}</p>
              <div className="md:col-span-9">
                <h3 className="font-display text-[clamp(28px,3vw,44px)] leading-[1.02] text-ink">{e.role}</h3>
                <p className="mt-1 text-lg font-bold text-ink/70">{e.org}</p>
                <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{e.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function ToolCard({ t, i }: { t: (typeof tools)[number]; i: number }) {
  return (
    <Reveal delay={(i % 5) * 0.05}>
      <div className="group relative h-full overflow-hidden rounded-[22px] bg-mist p-5 transition-all duration-500 hover:-translate-y-2 hover:bg-ink hover:shadow-[0_30px_60px_-30px_rgba(3,19,58,0.6)] md:p-6">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl font-display text-2xl text-white transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"
          style={{ background: t.color }}
          aria-hidden
        >
          {t.name.charAt(0)}
        </span>
        <p className="mt-6 text-lg font-extrabold text-ink transition-colors duration-500 group-hover:text-white">{t.name}</p>
        <p className="text-sm text-muted transition-colors duration-500 group-hover:text-white/60">{t.note}</p>
        <span className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-purple transition-colors duration-500 group-hover:bg-lime group-hover:text-ink">
          {t.group}
        </span>
      </div>
    </Reveal>
  );
}

const values = [
  {
    title: "Clarity first",
    body: "Plain-English updates, clear scopes and no surprises. You always know where your project stands.",
    icon: "◎",
  },
  {
    title: "Built to last",
    body: "Clean databases, reusable elements and tidy workflows, so your app stays fast and easy to grow.",
    icon: "▲",
  },
  {
    title: "Design that sells",
    body: "Every screen is designed to help users act, whether that’s booking, buying or getting in touch.",
    icon: "✦",
  },
];

export function AboutView() {
  return (
    <>
      <PageHeader
        label="About me"
        lines={["Hi, I’m", <span key="b" className="text-purple">George</span>]}
        intro={`${site.name}: ${site.role} and founder of Nexorah. I help founders and brands turn ideas into real, working products.`}
      />

      <section className="container-x pb-20 md:pb-32">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <TiltPortrait />
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <ScrollWords
              className="text-[clamp(24px,2.7vw,42px)] font-extrabold leading-[1.25] tracking-[-0.02em] text-ink"
              highlight={["Bubble.io", "APIs", "automation"]}
              text="I’m a Bubble.io developer based in Nigeria, working with clients worldwide. I design and build booking platforms, reservation systems and premium websites, then wire them to real APIs and automation so the data stays accurate and the business runs smoother."
            />
            <Reveal delay={0.1} className="mt-10 grid gap-6 text-[17px] leading-relaxed text-muted md:grid-cols-2">
              <p>
                I started with no-code tools because I wanted to build things fast. Today, Bubble.io is where I build full-stack
                products: user accounts, databases, payments and integrations, all without cutting corners.
              </p>
              <p>
                Around it I use Xano for heavier backends, n8n and Airtable for automation, Figma for design and ElevenLabs for AI
                voice. The right tool for each job, working together as one system.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="mt-10 flex flex-wrap gap-3">
              <Button href="/contact" variant="purple">
                Work with me
              </Button>
              <Button href={site.socials[0].href} external variant="outline" diagonal>
                Hire me on Upwork
              </Button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="container-x pb-24 md:pb-36">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07}>
              <div className="group rounded-[24px] bg-ink p-6 text-white transition-colors duration-500 hover:bg-violet md:p-8">
                <p className="font-display text-[clamp(44px,5vw,76px)] text-lime">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 font-semibold text-white/70">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* experience */}
      <section className="container-x pb-24 md:pb-36" aria-labelledby="exp-h">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+40px)]">
              <Reveal>
                <SectionLabel>Experience</SectionLabel>
              </Reveal>
              <LineReveal as="h2" className="mt-6 font-display text-[clamp(44px,5.4vw,88px)] leading-[0.95] text-ink" lines={["My", <span key="b" className="text-purple">journey</span>]} />
              <span id="exp-h" className="sr-only">
                Experience
              </span>
            </div>
          </div>
          <div className="lg:col-span-8">
            <Timeline />
          </div>
        </div>
      </section>

      {/* toolkit */}
      <section className="bg-paper pb-24 md:pb-36" aria-labelledby="tools-h">
        <div className="container-x">
          <div className="mb-12 flex flex-col gap-6 md:mb-16 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Reveal>
                <SectionLabel>Toolkit</SectionLabel>
              </Reveal>
              <LineReveal as="h2" className="mt-6 font-display text-[clamp(44px,6vw,96px)] leading-[0.95] text-ink" lines={["The stack", <span key="b" className="text-purple">I build with</span>]} />
              <span id="tools-h" className="sr-only">
                Toolkit
              </span>
            </div>
            <Reveal delay={0.1} className="max-w-sm text-lg text-muted">
              Hover a tool to see what I use it for. Bubble.io sits at the centre, with everything else connected around it.
            </Reveal>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {tools.map((t, i) => (
              <ToolCard key={t.name} t={t} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* values */}
      <section className="grain relative overflow-hidden bg-ink py-24 text-white md:py-36" aria-labelledby="values-h">
        <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-50" />
        <div className="container-x relative">
          <Reveal>
            <SectionLabel dark>How I work</SectionLabel>
          </Reveal>
          <LineReveal as="h2" className="mt-6 font-display text-[clamp(44px,6vw,96px)] leading-[0.95]" lines={["What you can", <span key="b" className="text-lime">count on</span>]} />
          <span id="values-h" className="sr-only">
            Values
          </span>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -10, rotate: i === 1 ? 0 : i === 0 ? -1.5 : 1.5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="h-full rounded-[28px] bg-white/[0.06] p-8 ring-1 ring-white/10 transition-colors duration-500 hover:bg-violet md:p-10"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-2xl text-ink" aria-hidden>
                    {v.icon}
                  </span>
                  <h3 className="mt-8 font-display text-[36px] leading-none">{v.title}</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-white/70">{v.body}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

