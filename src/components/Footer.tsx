"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { nav, site } from "@/content/site";
import { LogoMark } from "./Logo";
import { useApp } from "./providers/AppProvider";
import { TransitionLink } from "./providers/TransitionLink";
import { Arrow, Button, RollText } from "./ui/Button";
import { CopyEmail, LocalTime, Magnetic } from "./ui/bits";
import { CharReveal } from "./ui/Reveal";

function SpinBadge() {
  const text = "START A PROJECT • START A PROJECT • ";
  return (
    <Magnetic strength={0.3}>
      <TransitionLink
        href="/contact"
        className="group relative grid h-40 w-40 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 hover:scale-105 md:h-48 md:w-48"
        aria-label="Start a project"
        data-cursor="Let's go"
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
          <defs>
            <path id="spin-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
          </defs>
          <text className="fill-ink text-[15px] font-extrabold tracking-[0.2em]">
            <textPath href="#spin-circle">{text}</textPath>
          </text>
        </svg>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-lime transition-all duration-500 group-hover:rotate-[-45deg] group-hover:scale-110">
          <Arrow className="h-7 w-7" />
        </span>
      </TransitionLink>
    </Magnetic>
  );
}

export function Footer() {
  const { scrollTo } = useApp();
  const ref = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const wordIn = useInView(wordRef, { once: true, amount: 0.4 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-18%", "0%"]);

  return (
    <footer ref={ref} className="relative overflow-hidden bg-ink text-white">
      <motion.div style={{ y }} className="relative">
        <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-violet/30 blur-[120px]" />

        <div className="container-x relative pb-10 pt-24 md:pt-36">
          {/* CTA */}
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-6 inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-lime">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-green-500" />
                Available for new projects
              </p>
              <h2 className="font-display text-[clamp(52px,9vw,150px)] leading-[0.92]">
                <CharReveal text="Got an idea?" stagger={0.025} />
                <br />
                <span className="text-lime">
                  <CharReveal text="Let’s build it." stagger={0.025} delay={0.25} />
                </span>
              </h2>
            </div>
            <SpinBadge />
          </div>

          <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Button href={`mailto:${site.email}`} external variant="lime" size="lg">
              Email me
            </Button>
            <Button href={site.whatsappLink} external variant="outline-light" size="lg" diagonal>
              Chat on WhatsApp
            </Button>
          </div>

          {/* Links */}
          <div className="mt-20 grid gap-10 border-t border-white/12 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Pages</p>
              <ul className="space-y-2">
                {nav.map((n) => (
                  <li key={n.href}>
                    <TransitionLink href={n.href} className="group inline-flex text-lg font-semibold text-white/85 hover:text-lime">
                      <RollText>{n.label}</RollText>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Socials</p>
              <ul className="space-y-2">
                {site.socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-lg font-semibold text-white/85 hover:text-lime">
                      <RollText>{s.label}</RollText>
                      <Arrow className="h-4 w-4 -rotate-45 opacity-50 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Contact</p>
              <CopyEmail email={site.email} className="link-underline text-left text-lg font-semibold text-white/85 hover:text-lime" />
              <a href={site.whatsappLink} target="_blank" rel="noopener noreferrer" className="link-underline mt-2 block w-fit text-lg font-semibold text-white/85 hover:text-lime">
                {site.whatsapp.replace(/(\+\d{3})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4")}
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Local time</p>
              <p className="text-3xl font-bold">
                <LocalTime timeZone={site.timezone} />
              </p>
              <p className="text-white/55">
                {site.location} · {site.timezoneLabel}
              </p>
            </div>
          </div>

          {/* Giant wordmark */}
          <div ref={wordRef} className="mt-20 flex items-end justify-between gap-4 overflow-hidden" aria-hidden>
            {"NEXORAH".split("").map((c, i) => (
              <motion.span
                key={i}
                className="font-[family-name:var(--font-logo)] text-[clamp(44px,13.4vw,210px)] leading-[0.8] text-white/[0.07]"
                initial={{ y: "100%" }}
                animate={wordIn ? { y: "0%" } : undefined}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
              >
                {c}
              </motion.span>
            ))}
          </div>

          <div className="mt-8 flex flex-col-reverse items-start justify-between gap-6 border-t border-white/12 pt-8 text-sm text-white/55 md:flex-row md:items-center">
            <p className="flex items-center gap-3">
              <LogoMark className="h-5 w-auto" />© {new Date().getFullYear()} {site.name} · Nexorah. All rights reserved.
            </p>
            <button
              type="button"
              onClick={() => scrollTo(0)}
              className="group inline-flex items-center gap-3 font-semibold text-white hover:text-lime"
            >
              <RollText>Back to top</RollText>
              <span className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/25 transition-all duration-500 group-hover:-translate-y-1 group-hover:bg-lime group-hover:text-ink">
                <Arrow className="h-4 w-4 -rotate-90" />
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}
