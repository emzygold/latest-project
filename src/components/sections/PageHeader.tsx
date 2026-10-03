"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReady } from "../providers/AppProvider";
import { SectionLabel } from "../ui/bits";
import { LineReveal } from "../ui/Reveal";

/** Big editorial page title used at the top of inner pages */
export function PageHeader({
  label,
  lines,
  intro,
  aside,
  count,
}: {
  label: string;
  lines: ReactNode[];
  intro?: string;
  aside?: ReactNode;
  count?: number;
}) {
  const ready = useReady();
  return (
    <section className="container-x relative pb-14 pt-[calc(var(--nav-h)+56px)] md:pb-20 md:pt-[calc(var(--nav-h)+90px)]">
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_left,black_10%,transparent_60%)] opacity-70" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={ready ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <SectionLabel>{label}</SectionLabel>
      </motion.div>
      <div className="mt-7 grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="relative lg:col-span-8">
          <LineReveal
            as="h1"
            immediate
            delay={0.1}
            className="font-display text-[clamp(50px,8.4vw,140px)] leading-[0.92] text-ink"
            lines={lines}
          />
          {count !== undefined && (
            <motion.sup
              className="absolute -top-2 right-0 font-display text-[clamp(22px,2.6vw,40px)] text-purple md:right-auto md:left-full md:ml-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={ready ? { opacity: 1, scale: 1 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.7 }}
            >
              ({String(count).padStart(2, "0")})
            </motion.sup>
          )}
        </div>
        {(intro || aside) && (
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 24 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
          >
            {intro && <p className="text-lg leading-relaxed text-muted md:text-xl">{intro}</p>}
            {aside}
          </motion.div>
        )}
      </div>
    </section>
  );
}
