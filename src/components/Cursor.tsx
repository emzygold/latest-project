"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

type Mode = "default" | "link" | "label" | "hidden" | "text";

/**
 * Custom cursor: a small dot plus a trailing ring.
 * Elements can opt into states with data attributes:
 *   data-cursor="View"   -> big violet disc with a label
 *   data-cursor="hide"   -> hide the ring (e.g. over inputs)
 * Links and buttons automatically enlarge the ring.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState("");
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduce.matches);
    update();
    fine.addEventListener("change", update);
    return () => fine.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove("has-cursor");
      return;
    }
    document.documentElement.classList.add("has-cursor");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled) {
        const v = labelled.dataset.cursor ?? "";
        if (v === "hide") setMode("hidden");
        else {
          setLabel(v);
          setMode("label");
        }
        return;
      }
      if (t.closest("input, textarea, select")) return setMode("text");
      if (t.closest("a, button, [role=button], label")) return setMode("link");
      setMode("default");
    };
    const leave = () => setVisible(false);
    const pd = () => setDown(true);
    const pu = () => setDown(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over);
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const ringSize = mode === "label" ? 96 : mode === "link" ? 64 : mode === "text" ? 4 : 36;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-hidden style={{ opacity: visible ? 1 : 0 }}>
      {/* trailing ring */}
      <motion.div className="fixed left-0 top-0" style={{ x: rx, y: ry }}>
        <motion.div
          className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          animate={{
            width: ringSize,
            height: ringSize,
            opacity: mode === "hidden" || mode === "text" ? 0 : 1,
            scale: down ? 0.85 : 1,
            backgroundColor: mode === "label" ? "rgba(108,62,252,1)" : mode === "link" ? "rgba(218,245,10,0.35)" : "rgba(108,62,252,0)",
            borderColor: mode === "label" ? "rgba(108,62,252,0)" : mode === "link" ? "rgba(218,245,10,0)" : "rgba(108,62,252,0.55)",
          }}
          style={{ borderWidth: 1.5, borderStyle: "solid", mixBlendMode: mode === "link" ? "multiply" : "normal" }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          <AnimatePresence>
            {mode === "label" && (
              <motion.span
                key={label}
                className="text-[13px] font-bold uppercase tracking-[0.12em] text-white"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.25 }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      {/* precise dot */}
      <motion.div className="fixed left-0 top-0" style={{ x, y }}>
        <motion.div
          className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet"
          animate={{ scale: mode === "label" || mode === "hidden" || mode === "text" ? 0 : 1 }}
        />
      </motion.div>
    </div>
  );
}
