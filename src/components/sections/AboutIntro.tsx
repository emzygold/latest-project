"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import { site, stats } from "@/content/site";
import { Button } from "../ui/Button";
import { CountUp, ScrollWords, SectionLabel } from "../ui/bits";
import { Reveal } from "../ui/Reveal";

export function AboutIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, 6]);

  return (
    <section className="container-x relative overflow-x-clip py-20 md:py-32" aria-labelledby="about-intro">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <Reveal>
            <SectionLabel>About me</SectionLabel>
          </Reveal>
          <h2 id="about-intro" className="sr-only">
            About George
          </h2>
          <ScrollWords
            className="mt-8 text-[clamp(26px,3.4vw,52px)] font-extrabold leading-[1.18] tracking-[-0.02em] text-ink"
            highlight={["Bubble.io", "APIs", "automations"]}
            text={`I’m ${site.firstName}, a Bubble.io developer who turns ideas into fully working web apps. Booking engines, reservation systems and premium websites, designed with care and wired to real APIs and automations so your business runs smoother.`}
          />
          <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-3">
            <Button href="/about" variant="outline">
              More about me
            </Button>
          </Reveal>
        </div>

        <div ref={ref} className="relative lg:col-span-4">
          <motion.div
            style={{ rotate }}
            className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-[28px] bg-violet shadow-[0_40px_80px_-40px_rgba(91,26,235,0.6)]"
            data-cursor="Hi!"
          >
            <motion.div className="absolute inset-[-12%]" style={{ y: imgY }}>
              <Image src="/images/george-portrait.webp" alt="" fill sizes="380px" className="object-cover" />
            </motion.div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-sm font-extrabold text-ink">{site.name}</p>
                <p className="text-xs font-semibold text-muted">{site.role}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-lg" aria-hidden>
                👋
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-line ring-1 ring-line md:mt-28 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="group relative bg-paper p-6 transition-colors duration-500 hover:bg-ink md:p-10">
            <p className="font-display text-[clamp(44px,5vw,80px)] text-ink transition-colors duration-500 group-hover:text-lime">
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-[15px] font-semibold text-muted transition-colors duration-500 group-hover:text-white/70">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
