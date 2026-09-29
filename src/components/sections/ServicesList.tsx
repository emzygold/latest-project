"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { services } from "@/content/site";
import { TransitionLink } from "../providers/TransitionLink";
import { Arrow, Button } from "../ui/Button";
import { SectionLabel } from "../ui/bits";
import { LineReveal, Reveal } from "../ui/Reveal";

/** Dark services block with a violet row-fill hover */
export function ServicesList() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="grain relative overflow-hidden bg-ink py-24 text-white md:py-36" aria-labelledby="services-heading">
      <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-50" />
      <div className="container-x relative">
        <div className="mb-14 flex flex-col gap-8 md:mb-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Reveal>
              <SectionLabel dark>What I do</SectionLabel>
            </Reveal>
            <LineReveal
              as="h2"
              className="mt-6 font-display text-[clamp(44px,7vw,110px)] leading-[0.95]"
              lines={["Services that", <span key="b" className="text-lime">move you forward</span>]}
            />
            <span id="services-heading" className="sr-only">
              Services
            </span>
          </div>
          <Reveal delay={0.15}>
            <Button href="/services" variant="outline-light">
              Explore services
            </Button>
          </Reveal>
        </div>

        <ul className="border-t border-white/15" onMouseLeave={() => setActive(null)}>
          {services.map((s, i) => {
            const on = active === i;
            return (
              <li key={s.title} className="relative border-b border-white/15" onMouseEnter={() => setActive(i)}>
                <TransitionLink href="/services" className="group relative block overflow-hidden">
                  <motion.span
                    className="absolute inset-0 origin-bottom bg-violet"
                    initial={false}
                    animate={{ scaleY: on ? 1 : 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-5 py-7 md:gap-10 md:px-4 md:py-9">
                    <span className={`text-sm font-bold transition-colors duration-300 ${on ? "text-lime" : "text-white/40"}`}>
                      0{i + 1}
                    </span>
                    <div>
                      <motion.h3
                        className="font-display text-[clamp(28px,3.6vw,56px)] leading-[1]"
                        animate={{ x: on ? 16 : 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {s.title}
                      </motion.h3>
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.div
                            className="hidden overflow-hidden md:block"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <p className="max-w-2xl pl-4 pt-3 text-white/80">{s.body}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-500 md:h-14 md:w-14 ${
                        on ? "rotate-0 bg-lime text-ink" : "-rotate-45 bg-white/10 text-white"
                      }`}
                    >
                      <Arrow className="h-5 w-5" />
                    </span>
                  </div>
                </TransitionLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
