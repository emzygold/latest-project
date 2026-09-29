"use client";

import { motion, useInView } from "motion/react";
import { useId, useRef, type ReactNode } from "react";
import { useReady } from "../providers/AppProvider";
import { VelocityMarquee } from "../ui/bits";

/* Brand marks: simple-icons (CC0) paths plus hand-drawn multi-colour versions */
const logos: { name: string; bg: string; icon: (id: string) => ReactNode }[] = [
  {
    name: "Canva",
    bg: "transparent",
    icon: (id) => (
      <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
        <defs>
          <linearGradient id={`canva-g-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#00C4CC" />
            <stop offset="0.55" stopColor="#6A5BFF" />
            <stop offset="1" stopColor="#7D2AE8" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="24" fill={`url(#canva-g-${id})`} />
        <text x="24" y="29.5" textAnchor="middle" fill="#fff" fontSize="14.5" fontStyle="italic" fontWeight="700" fontFamily="'Brush Script MT','Segoe Script',cursive">
          Canva
        </text>
      </svg>
    ),
  },
  {
    name: "Notion",
    bg: "#fff",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
        <path fill="#000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    ),
  },
  {
    name: "WordPress",
    bg: "transparent",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
        <path fill="#21759B" d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.061 1.125.09l1.68 4.605-2.37 7.08L5.354 6.9c.649-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.2 0-.438-.008-.69-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.833-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61.001.014zM12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149-1.12.393-2.325.609-3.582.609M1.211 12c0-1.564.336-3.05.935-4.39L7.29 21.709C3.694 19.96 1.212 16.271 1.211 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0" />
      </svg>
    ),
  },
  {
    name: "Bubble.io",
    bg: "#fff",
    icon: () => (
      <svg viewBox="0 0 32 36" className="h-9 w-9" aria-hidden>
        <rect x="9" y="2" width="5.2" height="28" rx="1.2" fill="#0A0A0A" />
        <circle cx="19.5" cy="22.5" r="7.4" fill="none" stroke="#0A0A0A" strokeWidth="5.2" />
        <circle cx="4" cy="31.5" r="3" fill="#3E3BF5" />
      </svg>
    ),
  },
  {
    name: "n8n",
    bg: "transparent",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
        <path fill="#EA4B71" d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632" />
      </svg>
    ),
  },
  {
    name: "Make",
    bg: "#F6F0FF",
    icon: (id) => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
        <defs>
          <linearGradient id={`make-g-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#B02DE9" />
            <stop offset="0.5" stopColor="#8A1CD8" />
            <stop offset="1" stopColor="#6D00CC" />
          </linearGradient>
        </defs>
        <path fill={`url(#make-g-${id})`} d="M13.38 3.498c-.27 0-.511.19-.566.465L9.85 18.986a.578.578 0 0 0 .453.678l4.095.826a.58.58 0 0 0 .682-.455l2.963-15.021a.578.578 0 0 0-.453-.678l-4.096-.826a.589.589 0 0 0-.113-.012zm-5.876.098a.576.576 0 0 0-.516.318L.062 17.697a.575.575 0 0 0 .256.774l3.733 1.877a.578.578 0 0 0 .775-.258l6.926-13.781a.577.577 0 0 0-.256-.776L7.762 3.658a.571.571 0 0 0-.258-.062zm11.74.115a.576.576 0 0 0-.576.576v15.426c0 .318.258.578.576.578h4.178a.58.58 0 0 0 .578-.578V4.287a.578.578 0 0 0-.578-.576Z" />
      </svg>
    ),
  },
  {
    name: "Figma",
    bg: "transparent",
    icon: () => (
      <svg viewBox="0 0 38 57" className="h-10 w-10" aria-hidden>
        <path fill="#1ABCFE" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
        <path fill="#0ACF83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
        <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
        <path fill="#F24E1E" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
        <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
      </svg>
    ),
  },
  {
    name: "Supabase",
    bg: "transparent",
    icon: (id) => (
      <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
        <defs>
          <linearGradient id={`supa-g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#249361" />
            <stop offset="1" stopColor="#3ECF8E" />
          </linearGradient>
        </defs>
        <path fill={`url(#supa-g-${id})`} d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" />
      </svg>
    ),
  },
  {
    name: "Airtable",
    bg: "transparent",
    icon: () => (
      <svg viewBox="0 0 200 170" className="h-10 w-10" aria-hidden>
        <path fill="#FCB400" d="M90 12.4 24.1 39.7c-3.7 1.5-3.6 6.7.1 8.2l66.2 26.3a24.6 24.6 0 0 0 18.1 0l66.2-26.3c3.7-1.5 3.7-6.7.1-8.2L108.8 12.4a24.6 24.6 0 0 0-18.8 0" />
        <path fill="#18BFFF" d="M105.3 88.5v65.6c0 3.1 3.1 5.3 6 4.1l73.8-28.6a4.4 4.4 0 0 0 2.8-4.1V59.8c0-3.1-3.1-5.3-6-4.1l-73.8 28.6a4.4 4.4 0 0 0-2.8 4.2" />
        <path fill="#F82B60" d="M88.1 91.8 66.2 102.4l-2.2 1.1-46.3 22.2c-2.9 1.4-6.7-.7-6.7-4V60.1c0-1.2.6-2.2 1.4-3a5 5 0 0 1 1.1-.8c1.1-.7 2.7-.8 4-.3l70.2 27.8c3.6 1.4 3.8 6.4.4 8.1" />
      </svg>
    ),
  },
];

function Logo({ l, i, show }: { l: (typeof logos)[number]; i: number; show: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <motion.li
      className="group flex flex-none items-center gap-3.5 px-6 lg:px-0"
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={show ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.06 }}
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-hover:-rotate-6 group-hover:scale-110"
        style={{ background: l.bg, boxShadow: l.bg === "transparent" ? undefined : "0 6px 18px -8px rgba(3,19,58,0.25)" }}
      >
        {l.icon(id)}
      </span>
      <span className="whitespace-nowrap text-[16px] font-semibold text-ink/75 transition-colors duration-300 group-hover:text-purple">{l.name}</span>
    </motion.li>
  );
}

/** "Tools / Stack" logo strip shown right after the hero */
export function StackStrip() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const ready = useReady();
  const show = inView && ready;

  return (
    <section ref={ref} aria-labelledby="stack-h" className="relative z-10 bg-paper pb-4 pt-10 md:pt-14">
      <div className="container-x">
        <div className="flex items-center gap-5 md:gap-8">
          <motion.span
            className="h-px flex-1 origin-right bg-gradient-to-r from-transparent to-violet/40"
            initial={{ scaleX: 0 }}
            animate={show ? { scaleX: 1 } : undefined}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.h2
            id="stack-h"
            className="text-[12px] font-extrabold uppercase tracking-[0.32em] text-ink/60 md:text-[13px]"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={show ? { opacity: 1, letterSpacing: "0.32em" } : undefined}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Tools / Stack
          </motion.h2>
          <motion.span
            className="h-px flex-1 origin-left bg-gradient-to-l from-transparent to-violet/40"
            initial={{ scaleX: 0 }}
            animate={show ? { scaleX: 1 } : undefined}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* desktop: one row with dividers */}
        <ul className="mt-9 hidden items-center justify-between lg:flex">
          {logos.map((l, i) => (
            <li key={l.name} className="contents">
              {i > 0 && (
                <motion.span
                  aria-hidden
                  className="h-10 w-px bg-line"
                  initial={{ scaleY: 0 }}
                  animate={show ? { scaleY: 1 } : undefined}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.06 }}
                />
              )}
              <ul className="contents">
                <Logo l={l} i={i} show={show} />
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* mobile / tablet: scrolling marquee */}
      <div className="marquee-mask mt-8 lg:hidden">
        <VelocityMarquee baseVelocity={-1.2}>
          <ul className="flex items-center">
            {logos.map((l, i) => (
              <Logo key={l.name} l={l} i={i} show={show} />
            ))}
          </ul>
        </VelocityMarquee>
      </div>
    </section>
  );
}
