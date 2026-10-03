"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { TransitionLink } from "../providers/TransitionLink";

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Two stacked copies of the text; letters roll up on hover */
export function RollText({ children }: { children: string }) {
  const chars = Array.from(children);
  const row = (
    <span className="roll-row" aria-hidden>
      {chars.map((c, i) => (
        <span key={i} className="roll-char" style={{ ["--i" as string]: i }}>
          {c}
        </span>
      ))}
    </span>
  );
  return (
    <span className="roll">
      {row}
      {row}
      <span className="sr-only">{children}</span>
    </span>
  );
}

export function ArrowSwap({ diagonal = false, className = "" }: { diagonal?: boolean; className?: string }) {
  return (
    <span className={`${diagonal ? "arrow-diag" : ""} ${className}`}>
      <span className="arrow-swap">
        <Arrow />
        <Arrow />
      </span>
    </span>
  );
}

type Variant = "purple" | "dark" | "outline" | "outline-light" | "lime";

type ButtonProps = {
  children: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  arrow?: boolean;
  diagonal?: boolean;
  magnetic?: boolean;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
};

/**
 * Pill button with:
 *  - magnetic pull toward the pointer
 *  - a fill that grows from where the pointer entered
 *  - letter-by-letter text roll
 *  - arrow that flies out and back in
 */
export function Button({
  children,
  href,
  external,
  onClick,
  type = "button",
  variant = "purple",
  size = "md",
  arrow = true,
  diagonal = false,
  magnetic = true,
  className = "",
  disabled,
  icon,
}: ButtonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 16, mass: 0.4 });

  const setOrigin = (e: MouseEvent) => {
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  const onMove = (e: MouseEvent) => {
    if (!magnetic || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };

  const enter = (e: MouseEvent) => {
    setOrigin(e);
    setHover(true);
  };
  const leave = (e: MouseEvent) => {
    setOrigin(e);
    setHover(false);
    mx.set(0);
    my.set(0);
  };

  const cls = `btn btn-${variant} ${size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : ""} ${hover ? "is-hover" : ""} ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;

  const inner = (
    <>
      <span className="btn-fill" aria-hidden />
      {icon}
      <RollText>{children}</RollText>
      {arrow && <ArrowSwap diagonal={diagonal} />}
    </>
  );

  const content = href ? (
    external ? (
      <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cls}>
        {inner}
      </a>
    ) : (
      <TransitionLink href={href} className={cls}>
        {inner}
      </TransitionLink>
    )
  ) : (
    <button type={type} onClick={onClick} className={cls} disabled={disabled}>
      {inner}
    </button>
  );

  return (
    <motion.span
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onMouseMove={onMove}
    >
      {content}
    </motion.span>
  );
}
