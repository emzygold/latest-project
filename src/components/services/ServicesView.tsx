"use client";

import { motion } from "motion/react";
import { faqs, services, site } from "@/content/site";
import { PageHeader } from "../sections/PageHeader";
import { Process } from "../sections/Process";
import { ToolsBand } from "../sections/ToolsBand";
import { Button } from "../ui/Button";
import { Accordion, SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

const icons = [
  // app
  <path key="a" d="M4 5h16v14H4zM4 9h16M8 7h.01M11 7h.01" />,
  // plug
  <path key="b" d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />,
  // bolt
  <path key="c" d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  // globe
  <path key="d" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />,
  // pen
  <path key="e" d="m4 20 4-1 11-11-3-3L5 16zM14 6l3 3" />,
  // layers
  <path key="f" d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />,
];

function ServiceCard({ s, i }: { s: (typeof services)[number]; i: number }) {
  return (
    <Reveal delay={(i % 2) * 0.08} className="h-full">
      <motion.article
        whileHover="hover"
        initial="rest"
        animate="rest"
        className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-mist p-7 md:p-9"
      >
        <motion.span
          className="absolute inset-0 origin-bottom-left rounded-[28px] bg-ink"
          variants={{ rest: { clipPath: "circle(0% at 0% 100%)" }, hover: { clipPath: "circle(150% at 0% 100%)" } }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="relative flex items-start justify-between">
          <motion.span
            className="grid h-14 w-14 place-items-center rounded-2xl bg-violet text-white"
            variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -10, scale: 1.1 } }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {icons[i % icons.length]}
            </svg>
          </motion.span>
          <span className="font-display text-4xl text-ink/10 transition-colors duration-500 group-hover:text-white/15">0{i + 1}</span>
        </div>
        <h3 className="relative mt-10 font-display text-[clamp(30px,2.8vw,44px)] leading-[1] text-ink transition-colors duration-500 group-hover:text-lime">
          {s.title}
        </h3>
        <p className="relative mt-4 text-[17px] leading-relaxed text-muted transition-colors duration-500 group-hover:text-white/75">{s.body}</p>
        <ul className="relative mt-7 space-y-2.5">
          {s.deliverables.map((d) => (
            <li key={d} className="flex items-center gap-3 font-semibold text-ink transition-colors duration-500 group-hover:text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-violet transition-colors group-hover:bg-lime" />
              {d}
            </li>
          ))}
        </ul>
        <div className="relative mt-auto flex flex-wrap gap-2 pt-8">
          {s.tools.map((t) => (
            <span key={t} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-purple transition-colors duration-500 group-hover:bg-white/10 group-hover:text-white">
              {t}
            </span>
          ))}
        </div>
      </motion.article>
    </Reveal>
  );
}

export function ServicesView() {
  return (
    <>
      <PageHeader
        label="Services"
        lines={["Built to", <span key="b" className="text-purple">ship & scale</span>]}
        intro="From a first MVP to a fully integrated booking platform, I design, build and connect the pieces your business needs to grow online."
        aside={
          <div className="mt-8">
            <Button href="/contact" variant="purple">
              Get a quote
            </Button>
          </div>
        }
      />

      <section className="container-x pb-10 md:pb-16" aria-label="Services">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.title} s={s} i={i} />
          ))}
        </div>
      </section>

      <ToolsBand />

      <Process />

      <section className="container-x py-24 md:py-36" aria-labelledby="faq-h">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+40px)]">
              <Reveal>
                <SectionLabel>FAQ</SectionLabel>
              </Reveal>
              <LineReveal as="h2" className="mt-6 font-display text-[clamp(44px,5.4vw,88px)] leading-[0.95] text-ink" lines={["Good", <span key="b" className="text-purple">questions</span>]} />
              <span id="faq-h" className="sr-only">
                Frequently asked questions
              </span>
              <Reveal delay={0.1} className="mt-6 text-lg text-muted">
                Can’t find your answer?{" "}
                <a href={site.whatsappLink} target="_blank" rel="noopener noreferrer" className="link-underline font-bold text-purple">
                  Message me on WhatsApp
                </a>
                .
              </Reveal>
            </div>
          </div>
          <div className="lg:col-span-8">
            <Reveal>
              <Accordion items={faqs} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
