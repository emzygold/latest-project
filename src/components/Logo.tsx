import { useId } from "react";

/** The Nexorah "N" bolt: violet leg, gradient stroke, lime leg */
export function LogoMark({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 50 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C3EFC" />
          <stop offset="1" stopColor="#DAF50A" />
        </linearGradient>
      </defs>
      <path className="logo-leg-a" d="M0 40 L12 0 H22 L10 40 Z" fill="#6C3EFC" />
      <path className="logo-diag" d="M12 0 H22 L38 40 H28 Z" fill={`url(#g-${id})`} />
      <path className="logo-leg-b" d="M28 40 H38 L50 0 H40 Z" fill="#DAF50A" />
    </svg>
  );
}

export function Logo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span className={`group/logo inline-flex items-center gap-3 ${className}`}>
      <LogoMark className="h-8 w-auto transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/logo:-rotate-6 group-hover/logo:scale-110 md:h-9" />
      <span
        className={`font-[family-name:var(--font-logo)] text-[22px] tracking-[0.08em] md:text-[25px] ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        NEXORAH
      </span>
    </span>
  );
}
