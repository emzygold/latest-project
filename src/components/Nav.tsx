"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav, site } from "@/content/site";
import { Logo } from "./Logo";
import { useApp } from "./providers/AppProvider";
import { TransitionLink } from "./providers/TransitionLink";
import { Button, RollText } from "./ui/Button";
import { LocalTime } from "./ui/bits";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  const { menuOpen, setMenuOpen, ready } = useApp();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 30);
    if (menuOpen) return;
    setHidden(y > 240 && y > prev + 2 ? true : y < prev - 2 ? false : hidden);
  });

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[80]"
        initial={{ y: "-100%" }}
        animate={{ y: ready && !(hidden && !menuOpen) ? "0%" : "-100%" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={`absolute inset-0 -z-10 transition-all duration-500 ${
            scrolled && !menuOpen ? "bg-white/80 shadow-[0_10px_40px_-20px_rgba(3,19,58,0.25)] backdrop-blur-xl" : "bg-transparent"
          }`}
        />
        <div className="container-x flex h-[var(--nav-h)] items-center justify-between">
          <TransitionLink href="/" aria-label="Nexorah home" className="relative z-10">
            <Logo dark={menuOpen} />
          </TransitionLink>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-2 xl:gap-6">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <TransitionLink
                      href={item.href}
                      className={`group relative block px-4 py-2 text-[15px] font-semibold transition-colors duration-300 ${
                        active ? "text-violet" : "text-ink hover:text-violet"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <RollText>{item.label}</RollText>
                      {active && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-4 -bottom-1 h-[2px] rounded-full bg-violet"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TransitionLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block">
              <Button href="/contact" variant="dark" size="sm">
                Let’s Talk
              </Button>
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className={`relative z-10 grid h-12 w-12 place-items-center rounded-full transition-colors duration-500 lg:hidden ${
                menuOpen ? "bg-lime text-ink" : "bg-ink text-white"
              }`}
            >
              <span className="relative block h-3 w-5">
                <motion.span
                  className="absolute left-0 top-0 h-[2px] w-full rounded bg-current"
                  animate={menuOpen ? { top: "50%", rotate: 45, y: "-50%" } : { top: "0%", rotate: 0, y: "0%" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 h-[2px] rounded bg-current"
                  animate={menuOpen ? { bottom: "50%", rotate: -45, y: "50%", width: "100%" } : { bottom: "0%", rotate: 0, y: "0%", width: "65%" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu pathname={pathname} />
    </>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const { menuOpen } = useApp();
  return (
    <AnimatePresence>
      {menuOpen && (
        <motion.div
          id="mobile-menu"
          className="fixed inset-0 z-[70] overflow-y-auto bg-ink text-white lg:hidden"
          initial={{ clipPath: "circle(0% at calc(100% - 48px) 44px)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 48px) 44px)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 48px) 44px)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-60" />
          <div className="container-x relative flex min-h-full flex-col justify-between pb-10 pt-[calc(var(--nav-h)+24px)]">
            <ul className="flex flex-col gap-1">
              {nav.map((item, i) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "110%" }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.25 + i * 0.06 }}
                    >
                      <TransitionLink href={item.href} className="group flex items-baseline gap-4 py-1">
                        <span className="text-sm font-bold text-lime/80">0{i + 1}</span>
                        <span
                          className={`font-display text-[clamp(48px,13vw,84px)] leading-[1.05] transition-colors ${
                            active ? "text-lime" : "text-white group-hover:text-lime"
                          }`}
                        >
                          {item.label}
                        </span>
                      </TransitionLink>
                    </motion.div>
                  </li>
                );
              })}
            </ul>

            <motion.div
              className="mt-12 grid gap-8 border-t border-white/15 pt-8 sm:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/50">Get in touch</p>
                <a href={`mailto:${site.email}`} className="text-lg font-semibold hover:text-lime">
                  {site.email}
                </a>
                <p className="mt-1 text-white/60">
                  Lagos time · <LocalTime timeZone={site.timezone} />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {site.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-white/20 transition-colors hover:bg-lime hover:text-ink"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
