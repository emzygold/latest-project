"use client";

import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { hero, site } from "@/content/site";
import { useApp } from "../providers/AppProvider";
import { Arrow, Button } from "../ui/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

function RotatingWord({ words, start }: { words: string[]; start: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!start) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % words.length), 2600);
    return () => window.clearInterval(id);
  }, [start, words.length]);
  const word = words[i];
  return (
    <span className="relative block h-[1.08em] overflow-hidden" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={word} className="block whitespace-nowrap" aria-label={word}>
          {Array.from(word).map((c, k) => (
            <motion.span
              key={k}
              className="inline-block whitespace-pre"
              aria-hidden
              initial={{ y: "105%", rotateX: -70, opacity: 0 }}
              animate={{ y: "0%", rotateX: 0, opacity: 1, transition: { duration: 0.7, ease: EASE, delay: k * 0.028 } }}
              exit={{ y: "-105%", rotateX: 70, opacity: 0, transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0], delay: k * 0.012 } }}
            >
              {c}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Chip({
  children,
  className = "",
  delay = 0,
  show,
  depthX,
  depthY,
  floatDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  show: boolean;
  depthX: MotionValue<number>;
  depthY: MotionValue<number>;
  floatDelay?: number;
}) {
  return (
    <motion.div className={`absolute z-20 ${className}`} style={{ x: depthX, y: depthY }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={show ? { opacity: 1, scale: 1, y: 0 } : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
      >
        <div
          className="flex animate-float items-center gap-2.5 rounded-full bg-white/85 px-4 py-2.5 text-[14px] font-bold text-ink shadow-[0_18px_40px_-18px_rgba(3,19,58,0.35)] ring-1 ring-ink/5 backdrop-blur-md"
          style={{ animationDelay: `${floatDelay}s` }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScrollBadge({ onClick, show }: { onClick: () => void; show: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Scroll to explore"
      className="group relative hidden h-28 w-28 place-items-center rounded-full lg:grid"
      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
      animate={show ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
      transition={{ duration: 1.1, ease: EASE, delay: 1.1 }}
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
        <defs>
          <path id="scroll-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <text className="fill-ink text-[10.5px] font-extrabold tracking-[0.28em]">
          <textPath href="#scroll-circle">SCROLL TO EXPLORE • SCROLL TO EXPLORE •</textPath>
        </text>
      </svg>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white transition-colors duration-300 group-hover:bg-violet">
        <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <Arrow className="h-5 w-5 rotate-90" />
        </motion.span>
      </span>
    </motion.button>
  );
}

export function Hero() {
  const { ready, scrollTo } = useApp();
  const ref = useRef<HTMLElement>(null);

  // pointer parallax
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 60, damping: 18 });
  const spy = useSpring(py, { stiffness: 60, damping: 18 });
  const portraitX = useTransform(spx, (v) => v * -18);
  const portraitY = useTransform(spy, (v) => v * -10);
  const blobX = useTransform(spx, (v) => v * 30);
  const blobY = useTransform(spy, (v) => v * 20);
  const c1x = useTransform(spx, (v) => v * 46);
  const c1y = useTransform(spy, (v) => v * 30);
  const c2x = useTransform(spx, (v) => v * -38);
  const c2y = useTransform(spy, (v) => v * -26);
  const c3x = useTransform(spx, (v) => v * 26);
  const c3y = useTransform(spy, (v) => v * -20);

  // scroll parallax
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const portraitScrollY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const portraitScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current!.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const [rotate, setRotate] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setRotate(true), 2400);
    return () => window.clearTimeout(id);
  }, [ready]);

  const titleTop = hero.titleTop.split(" ");

  return (
    <section
      ref={ref}
      onPointerMove={onMove}
      className="relative overflow-hidden bg-paper lg:h-[100svh] lg:min-h-[700px] lg:max-h-[1100px]"
      aria-label="Introduction"
    >
      {/* soft background */}
      <div className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-60" />

      <div className="container-x relative flex h-full flex-col pt-[calc(var(--nav-h)+28px)] lg:block lg:pt-0">
        {/* ---------- headline ---------- */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="relative z-10 lg:absolute lg:left-[var(--gutter)] lg:top-[35%] lg:max-w-[46%]"
        >
          <h1 className="font-display text-[clamp(44px,11.5vw,72px)] leading-[1.02] text-ink lg:text-[clamp(56px,4.9vw,104px)]">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={{ y: "105%" }}
                animate={ready ? { y: "0%" } : undefined}
                transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
              >
                {titleTop.map((w, i) => (
                  <span key={i} className="inline-block">
                    {w}
                    {i < titleTop.length - 1 ? " " : ""}
                  </span>
                ))}
              </motion.span>
            </span>
            <span className="block overflow-hidden text-purple">
              <motion.span
                className="block"
                initial={{ y: "105%" }}
                animate={ready ? { y: "0%" } : undefined}
                transition={{ duration: 1.1, ease: EASE, delay: 0.22 }}
              >
                <RotatingWord words={hero.rotatingWords} start={rotate} />
              </motion.span>
            </span>
          </h1>
          <motion.p
            className="mt-3 text-[17px] text-muted md:text-[19px]"
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1, ease: EASE, delay: 0.5 }}
          >
            {hero.subtitle}
          </motion.p>
        </motion.div>

        {/* ---------- portrait ---------- */}
        <div className="relative mx-auto mt-8 aspect-[1024/960] w-full max-w-[560px] lg:absolute lg:bottom-0 lg:left-1/2 lg:mt-0 lg:h-[88%] lg:w-auto lg:max-w-[54vw] lg:-translate-x-1/2">
          <motion.div
            className="absolute left-1/2 top-[8%] -z-0 aspect-square w-[78%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#efe9ff,#e3d9ff_45%,rgba(108,62,252,0.12)_70%,transparent_72%)]"
            style={{ x: blobX, y: blobY }}
            initial={{ scale: 0, opacity: 0 }}
            animate={ready ? { scale: 1, opacity: 1 } : undefined}
            transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
          />
          <motion.div
            className="absolute right-[12%] top-[14%] h-5 w-5 rounded-full bg-lime shadow-[0_0_0_8px_rgba(218,245,10,0.18)]"
            style={{ x: c1x, y: c1y }}
            initial={{ scale: 0 }}
            animate={ready ? { scale: 1 } : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 1 }}
          />
          <motion.div
            className="absolute left-[10%] top-[40%] h-3 w-3 rounded-full bg-violet"
            style={{ x: c2x, y: c2y }}
            initial={{ scale: 0 }}
            animate={ready ? { scale: 1 } : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 1.1 }}
          />
          <motion.div className="relative h-full w-full" style={{ y: portraitScrollY, scale: portraitScale }}>
            <motion.div className="relative h-full w-full" style={{ x: portraitX, y: portraitY }}>
              <motion.div
                className="relative h-full w-full [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent),linear-gradient(to_top,transparent,#000_10%)] [mask-composite:intersect]"
                initial={{ y: 90, opacity: 0, filter: "blur(12px)" }}
                animate={ready ? { y: 0, opacity: 1, filter: "blur(0px)" } : undefined}
                transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
              >
                <Image
                  src="/images/george-cutout.webp"
                  alt={`${site.name}, Bubble.io developer`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-contain object-bottom"
                />
              </motion.div>
            </motion.div>
          </motion.div>
          {/* fade the cut edge into the page on small screens */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper to-transparent lg:hidden" />

          {/* floating chips (desktop) */}
          <Chip show={ready} delay={1.2} depthX={c1x} depthY={c1y} className="right-[-4%] top-[22%] hidden md:block" floatDelay={0}>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-violet text-[11px] text-white">b</span>
            Bubble.io Developer
          </Chip>
          <Chip show={ready} delay={1.35} depthX={c2x} depthY={c2y} className="left-[-2%] top-[58%] hidden md:block" floatDelay={1.2}>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
              </svg>
            </span>
            API Integrations
          </Chip>
          <Chip show={ready} delay={1.5} depthX={c3x} depthY={c3y} className="left-[4%] top-[12%] hidden md:block" floatDelay={2.1}>
            <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-green-500" />
            Available for projects
          </Chip>
        </div>

        {/* ---------- right intro + CTA ---------- */}
        <motion.div
          className="relative z-10 -mt-4 pb-16 lg:absolute lg:bottom-[14%] lg:right-[var(--gutter)] lg:mt-0 lg:w-[min(380px,23vw)] lg:pb-0"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1.1, ease: EASE, delay: 0.65 }}
        >
          <p className="text-[17px] font-semibold leading-[1.6] text-[#484848] lg:text-[18px]">{hero.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 lg:pl-14">
            <Button href="/work" variant="purple" size="lg">
              View My Work
            </Button>
          </div>
        </motion.div>

        {/* scroll badge */}
        <div className="absolute bottom-8 left-[var(--gutter)] z-10">
          <ScrollBadge show={ready} onClick={() => scrollTo("#after-hero", { offset: -20 })} />
        </div>
      </div>
    </section>
  );
}
