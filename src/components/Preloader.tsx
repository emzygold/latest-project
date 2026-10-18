"use client";

import { animate, motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";
import { useApp } from "./providers/AppProvider";

const WORDS = ["Design", "Build", "Integrate", "Automate", "Launch"];

export function Preloader() {
  const { phase, finishLoading } = useApp();
  const [scope, run] = useAnimate();
  const [count, setCount] = useState(0);
  const [word, setWord] = useState(0);
  const [gone, setGone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("nx-seen") === "1";
      sessionStorage.setItem("nx-seen", "1");
    } catch {}
    const duration = reduce ? 0.2 : seen ? 0.9 : 2.1;

    const wordTimer = window.setInterval(() => setWord((w) => (w + 1) % WORDS.length), (duration * 1000) / WORDS.length);

    const counter = animate(0, 100, {
      duration,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
    });

    counter.then(async () => {
      window.clearInterval(wordTimer);
      await run(".pl-inner", { opacity: 0, y: -40 }, { duration: 0.45, ease: [0.7, 0, 0.84, 0] });
      finishLoading();
      run(".pl-curve", { scaleY: 0 }, { duration: 1, ease: [0.76, 0, 0.24, 1] });
      await run(scope.current, { y: "-100%" }, { duration: 1, ease: [0.76, 0, 0.24, 1] });
      setGone(true);
    });

    return () => window.clearInterval(wordTimer);
  }, [finishLoading, run, scope]);

  if (gone && phase !== "loading") return null;

  return (
    <div ref={scope} className="fixed inset-0 z-[100] bg-ink text-white" role="status" aria-label="Loading">
      <div className="pl-curve absolute inset-x-[-10%] top-full h-[18vh] origin-top rounded-b-[100%] bg-ink" />
      <div className="pl-inner container-x relative flex h-full flex-col justify-between py-8 md:py-12">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span className="font-[family-name:var(--font-logo)] tracking-[0.12em] text-white">NEXORAH</span>
          <span>George Nnamdi · Bubble.io Developer</span>
        </div>

        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <LogoMark className="h-16 w-auto md:h-20" />
          </motion.div>
          <div className="relative h-[1.2em] overflow-hidden text-2xl text-white/80 md:text-3xl">
            <motion.span
              key={word}
              className="block"
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {WORDS[word]}
            </motion.span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full origin-left rounded-full bg-lime" style={{ transform: `scaleX(${count / 100})` }} />
          </div>
          <div className="font-display text-[clamp(64px,12vw,180px)] leading-[0.8] tabular-nums">
            {String(count).padStart(3, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
