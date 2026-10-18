"use client";

import Lenis from "lenis";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Phase = "loading" | "idle" | "covering" | "revealing";

type AppCtx = {
  /** true once the preloader is gone and no page transition is covering the screen */
  ready: boolean;
  phase: Phase;
  label: string;
  navigate: (href: string, label?: string) => void;
  finishLoading: () => void;
  onCovered: () => void;
  onRevealed: () => void;
  lenis: React.RefObject<Lenis | null>;
  scrollTo: (target: number | string | HTMLElement, opts?: { immediate?: boolean; offset?: number }) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Convenience: true when page content may play its entrance animations */
export function useReady() {
  return useApp().ready;
}

function labelFor(href: string) {
  const path = href.split("?")[0].split("#")[0];
  if (path === "/") return "Home";
  const last = path.split("/").filter(Boolean).pop() ?? "";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useRef<Lenis | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [label, setLabel] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const covered = useRef(false);

  // Smooth scrolling
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const l = new Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 1 });
    lenis.current = l;
    return () => {
      l.destroy();
      lenis.current = null;
    };
  }, []);

  // Lock scroll while loading, covering or the menu is open
  useEffect(() => {
    const locked = phase === "loading" || phase === "covering" || menuOpen;
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }, [phase, menuOpen]);

  const scrollTo = useCallback<AppCtx["scrollTo"]>((target, opts) => {
    if (lenis.current) {
      lenis.current.scrollTo(target as never, {
        immediate: opts?.immediate,
        offset: opts?.offset ?? 0,
        duration: 1.4,
      });
      return;
    }
    if (typeof target === "number") window.scrollTo({ top: target, behavior: opts?.immediate ? "auto" : "smooth" });
    else {
      const el = typeof target === "string" ? document.querySelector(target) : target;
      el?.scrollIntoView({ behavior: opts?.immediate ? "auto" : "smooth" });
    }
  }, []);

  const navigate = useCallback(
    (href: string, customLabel?: string) => {
      const target = href.split("#")[0] || "/";
      setMenuOpen(false);
      if (target === pathname) {
        scrollTo(0);
        return;
      }
      if (phase === "covering") return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        router.push(href);
        return;
      }
      pendingHref.current = href;
      covered.current = false;
      setLabel(customLabel ?? labelFor(href));
      router.prefetch(href);
      setPhase("covering");
    },
    [pathname, phase, router, scrollTo],
  );

  // Curtain fully covers the screen -> swap the route
  const onCovered = useCallback(() => {
    covered.current = true;
    const href = pendingHref.current;
    if (href) router.push(href, { scroll: false });
  }, [router]);

  // New route rendered underneath the curtain -> reset scroll and reveal
  useEffect(() => {
    if (phase === "covering" && covered.current) {
      pendingHref.current = null;
      lenis.current?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      // allow a frame for layout before lifting the curtain
      requestAnimationFrame(() => setPhase("revealing"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const onRevealed = useCallback(() => setPhase("idle"), []);
  const finishLoading = useCallback(() => setPhase("idle"), []);

  const value = useMemo<AppCtx>(
    () => ({
      ready: phase === "idle" || phase === "revealing",
      phase,
      label,
      navigate,
      finishLoading,
      onCovered,
      onRevealed,
      lenis,
      scrollTo,
      menuOpen,
      setMenuOpen,
    }),
    [phase, label, navigate, finishLoading, onCovered, onRevealed, scrollTo, menuOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
