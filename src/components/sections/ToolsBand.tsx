"use client";

import { tools } from "@/content/site";
import { VelocityMarquee } from "../ui/bits";

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0Z" />
    </svg>
  );
}

/** Two crossing marquee bands of tools that react to scroll speed */
export function ToolsBand() {
  const names = tools.map((t) => t.name);
  const words = ["Bubble.io Apps", "API Integrations", "Automation", "Booking Systems", "UI/UX Design", "Websites"];
  return (
    <section id="after-hero" aria-label="Tools and services" className="relative z-10 overflow-hidden py-16 md:py-24">
      <div className="relative -mx-[6vw] -rotate-2">
        <VelocityMarquee baseVelocity={-1.6} className="bg-violet py-4 text-white md:py-6">
          {names.map((n) => (
            <span key={n} className="flex items-center">
              <span className="font-display px-6 text-[28px] md:px-10 md:text-[46px]">{n}</span>
              <Star className="h-5 w-5 text-lime md:h-7 md:w-7" />
            </span>
          ))}
        </VelocityMarquee>
      </div>
      <div className="relative -mx-[6vw] -mt-3 rotate-[1.5deg]">
        <VelocityMarquee baseVelocity={1.4} className="bg-ink py-3.5 text-lime md:py-5">
          {words.map((n) => (
            <span key={n} className="flex items-center">
              <span className="px-6 text-[17px] font-extrabold uppercase tracking-[0.2em] md:px-10 md:text-[20px]">{n}</span>
              <Star className="h-4 w-4 text-white" />
            </span>
          ))}
        </VelocityMarquee>
      </div>
    </section>
  );
}
