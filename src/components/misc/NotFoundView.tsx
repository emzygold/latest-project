"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useReady } from "../providers/AppProvider";
import { Button } from "../ui/Button";

export function NotFoundView() {
  const ready = useReady();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 14 });
  const sy = useSpring(my, { stiffness: 80, damping: 14 });
  const x1 = useTransform(sx, (v) => v * 40);
  const y1 = useTransform(sy, (v) => v * 30);
  const x2 = useTransform(sx, (v) => v * -40);
  const y2 = useTransform(sy, (v) => v * -30);

  return (
    <section
      className="container-x relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pb-20 pt-[var(--nav-h)] text-center"
      onPointerMove={(e) => {
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <div className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_65%)]" />
      <div className="relative select-none font-display text-[clamp(140px,32vw,460px)] leading-[0.8]" aria-hidden>
        <motion.span className="absolute inset-0 text-lime" style={{ x: x1, y: y1 }}>
          404
        </motion.span>
        <motion.span className="absolute inset-0 text-violet mix-blend-multiply" style={{ x: x2, y: y2 }}>
          404
        </motion.span>
        <motion.span
          className="relative text-ink"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
        >
          404
        </motion.span>
      </div>
      <h1 className="relative mt-8 font-display text-[clamp(32px,4vw,56px)] leading-none text-ink">This page went offline</h1>
      <p className="relative mt-4 max-w-md text-lg text-muted">The link might be broken, or the page may have moved. Let’s get you back on track.</p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Button href="/" variant="purple">
          Back home
        </Button>
        <Button href="/work" variant="outline">
          See my work
        </Button>
      </div>
    </section>
  );
}
