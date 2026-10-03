"use client";

import { motion, useInView, type Variants } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";
import { useReady } from "../providers/AppProvider";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise when scrolled into view (waits for the page curtain) */
export function Reveal({
  children,
  delay = 0,
  y = 36,
  className = "",
  amount = 0.25,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const ready = useReady();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView && ready ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const lineVariants: Variants = {
  hidden: { y: "105%" },
  show: (i: number) => ({ y: "0%", transition: { duration: 1.05, ease: EASE, delay: i } }),
};

/**
 * Masked line reveal for headings. Pass lines as an array so each line
 * slides up from behind its own mask.
 */
export function LineReveal({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
  stagger = 0.09,
  as = "h2",
  immediate = false,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  as?: ElementType;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const ready = useReady();
  const Comp = as;
  const show = ready && (immediate || inView);
  return (
    <Comp ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${lineClassName}`}
            variants={lineVariants}
            initial="hidden"
            animate={show ? "show" : "hidden"}
            custom={delay + i * stagger}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}

/** Letter-by-letter reveal (used for big display words) */
export function CharReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.03,
  immediate = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const ready = useReady();
  const show = ready && (immediate || inView);
  return (
    <span ref={ref} className={`inline-block ${className}`} aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom" aria-hidden>
          <motion.span
            className="inline-block whitespace-pre"
            initial={{ y: "110%", rotate: 8 }}
            animate={show ? { y: "0%", rotate: 0 } : { y: "110%", rotate: 8 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
          >
            {c}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
