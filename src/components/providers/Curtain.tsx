"use client";

import { useAnimate } from "motion/react";
import { useEffect } from "react";
import { LogoMark } from "../Logo";
import { useApp } from "./AppProvider";

const EASE = [0.76, 0, 0.24, 1] as const;

/** Full-screen two-layer curtain that covers the page between routes */
export function Curtain() {
  const { phase, label, onCovered, onRevealed } = useApp();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (phase === "covering") {
        animate(scope.current, { visibility: "visible" }, { duration: 0 });
        animate(".c-label", { y: "110%" }, { duration: 0 });
        animate(".c-mark", { opacity: 0, scale: 0.6, rotate: -30 }, { duration: 0 });
        animate(".c-violet", { y: "100%" }, { duration: 0 });
        animate(".c-ink", { y: "100%" }, { duration: 0 });
        animate(".c-curve-ink", { scaleY: 1 }, { duration: 0 });
        animate(".c-curve-violet", { scaleY: 1 }, { duration: 0 });
        animate(".c-violet", { y: "0%" }, { duration: 0.65, ease: EASE });
        animate(".c-curve-violet", { scaleY: 0 }, { duration: 0.65, ease: EASE });
        animate(".c-curve-ink", { scaleY: 0 }, { duration: 0.7, ease: EASE, delay: 0.08 });
        await animate(".c-ink", { y: "0%" }, { duration: 0.7, ease: EASE, delay: 0.08 });
        if (cancelled) return;
        animate(".c-mark", { opacity: 1, scale: 1, rotate: 0 }, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
        await animate(".c-label", { y: "0%" }, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
        if (!cancelled) onCovered();
      }
      if (phase === "revealing") {
        animate(".c-mark", { opacity: 0, scale: 0.8 }, { duration: 0.3 });
        await animate(".c-label", { y: "-110%" }, { duration: 0.35, ease: [0.7, 0, 0.84, 0] });
        animate(".c-curve-ink-b", { scaleY: 1 }, { duration: 0 });
        animate(".c-curve-violet-b", { scaleY: 1 }, { duration: 0 });
        animate(".c-ink", { y: "-100%" }, { duration: 0.8, ease: EASE });
        animate(".c-curve-ink-b", { scaleY: 0 }, { duration: 0.8, ease: EASE });
        animate(".c-curve-violet-b", { scaleY: 0 }, { duration: 0.85, ease: EASE, delay: 0.06 });
        await animate(".c-violet", { y: "-100%" }, { duration: 0.85, ease: EASE, delay: 0.06 });
        if (cancelled) return;
        animate(scope.current, { visibility: "hidden" }, { duration: 0 });
        onRevealed();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [phase, animate, scope, onCovered, onRevealed]);

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[90]" style={{ visibility: "hidden" }} aria-hidden>
      {/* violet layer */}
      <div className="c-violet absolute inset-0 bg-violet" style={{ transform: "translateY(100%)" }}>
        <div className="c-curve-violet absolute inset-x-[-10%] bottom-full h-[14vh] origin-bottom rounded-t-[100%] bg-violet" />
        <div className="c-curve-violet-b absolute inset-x-[-10%] top-full h-[14vh] origin-top rounded-b-[100%] bg-violet" style={{ transform: "scaleY(0)" }} />
      </div>
      {/* ink layer */}
      <div className="c-ink absolute inset-0 bg-ink" style={{ transform: "translateY(100%)" }}>
        <div className="c-curve-ink absolute inset-x-[-10%] bottom-full h-[14vh] origin-bottom rounded-t-[100%] bg-ink" />
        <div className="c-curve-ink-b absolute inset-x-[-10%] top-full h-[14vh] origin-top rounded-b-[100%] bg-ink" style={{ transform: "scaleY(0)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-white">
          <div className="c-mark">
            <LogoMark className="h-12 w-auto" />
          </div>
          <div className="overflow-hidden">
            <div className="c-label font-display text-[clamp(44px,8vw,120px)] leading-[1.05]">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
