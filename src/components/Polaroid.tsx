import type { ReactNode } from 'react'

export type SceneId = 'dance' | 'cake' | 'gele' | 'floor' | 'toast' | 'confetti'

const person = (x: number, s = 1, fill = '#1A0F10') => (
  <g transform={`translate(${x} 0) scale(${s})`} fill={fill}>
    <circle cx="0" cy="52" r="7" />
    <path d="M-11 100 C-11 72 -9 62 0 62 C9 62 11 72 11 100 Z" />
  </g>
)

/** Tiny illustrated wedding moments, drawn in SVG so the page needs no stock photos. */
const SCENES: Record<SceneId, { bg: string; draw: ReactNode }> = {
  dance: {
    bg: 'linear-gradient(180deg,#2A1A1C,#4F0B11 70%,#6F1018)',
    draw: (
      <>
        <path d="M0 18 Q50 34 100 16" stroke="#F5EDEE" strokeOpacity=".25" strokeWidth=".6" fill="none" />
        {Array.from({ length: 11 }, (_, i) => (
          <circle key={i} cx={i * 10 + 2} cy={18 + Math.sin((i / 10) * Math.PI) * 13} r="1.6" fill="#C9A24A" />
        ))}
        <ellipse cx="50" cy="100" rx="40" ry="8" fill="#C9A24A" opacity=".18" />
        {person(44, 1.05)}
        {person(57, 0.95)}
      </>
    ),
  },
  cake: {
    bg: 'linear-gradient(180deg,#F6E9EA,#E6C9A6)',
    draw: (
      <>
        <rect x="30" y="70" width="40" height="18" rx="2" fill="#FFFFFF" />
        <rect x="36" y="54" width="28" height="16" rx="2" fill="#FAF7F5" />
        <rect x="41" y="41" width="18" height="13" rx="2" fill="#FFFFFF" />
        <path d="M30 76h40M36 60h28M41 46h18" stroke="#C9A24A" strokeWidth="1.2" />
        <rect x="49" y="33" width="2" height="8" fill="#6F1018" />
        <ellipse cx="50" cy="31" rx="1.6" ry="2.6" fill="#D98E04" />
        <rect x="20" y="88" width="60" height="4" rx="2" fill="#6B5F60" opacity=".5" />
      </>
    ),
  },
  gele: {
    bg: 'linear-gradient(180deg,#D98E04,#C9A24A 55%,#9B2C35)',
    draw: (
      <>
        <circle cx="72" cy="28" r="12" fill="#FAF7F5" opacity=".55" />
        <path d="M28 46 C30 18 70 14 76 40 C66 30 58 34 52 30 C44 36 36 34 28 46 Z" fill="#6F1018" />
        <path d="M34 44 C40 24 62 22 70 40" stroke="#C9A24A" strokeWidth="1.4" fill="none" />
        <circle cx="50" cy="52" r="11" fill="#1A0F10" />
        <path d="M24 100 C24 74 36 64 50 64 C64 64 76 74 76 100 Z" fill="#1A0F10" />
      </>
    ),
  },
  floor: {
    bg: 'linear-gradient(180deg,#1A0F10,#2A1A1C)',
    draw: (
      <>
        <path d="M50 14 L10 100 L30 100 Z" fill="#C9A24A" opacity=".18" />
        <path d="M50 14 L90 100 L72 100 Z" fill="#9B2C35" opacity=".35" />
        <path d="M50 14 L48 100 L60 100 Z" fill="#F5EDEE" opacity=".08" />
        <circle cx="50" cy="16" r="7" fill="#6B5F60" />
        <path d="M44 14h12M45 18h10M50 9v14" stroke="#F5EDEE" strokeOpacity=".6" strokeWidth=".6" />
        {[12, 26, 40, 60, 74, 88].map((x, i) => (
          <g key={x}>{person(x, 0.7 + (i % 3) * 0.08)}</g>
        ))}
      </>
    ),
  },
  toast: {
    bg: 'linear-gradient(180deg,#9B2C35,#D98E04 60%,#C9A24A)',
    draw: (
      <>
        <circle cx="50" cy="62" r="18" fill="#FAF7F5" opacity=".7" />
        <rect x="0" y="74" width="100" height="26" fill="#4F0B11" opacity=".6" />
        <g transform="rotate(-14 40 60)">
          <path d="M34 34h12l-2 16a4 4 0 0 1-8 0z" fill="#FFFFFF" opacity=".9" />
          <rect x="39.3" y="54" width="1.4" height="16" fill="#FFFFFF" />
        </g>
        <g transform="rotate(14 60 60)">
          <path d="M54 34h12l-2 16a4 4 0 0 1-8 0z" fill="#FFFFFF" opacity=".9" />
          <rect x="59.3" y="54" width="1.4" height="16" fill="#FFFFFF" />
        </g>
        <path d="M48 28l2-6 2 6M44 30l-3-4M56 30l3-4" stroke="#FFFFFF" strokeWidth="1" />
      </>
    ),
  },
  confetti: {
    bg: 'linear-gradient(180deg,#FAF7F5,#F6E9EA)',
    draw: (
      <>
        {Array.from({ length: 26 }, (_, i) => (
          <rect
            key={i}
            x={(i * 37) % 100}
            y={(i * 23) % 60}
            width="3"
            height="1.6"
            transform={`rotate(${(i * 47) % 180} ${(i * 37) % 100} ${(i * 23) % 60})`}
            fill={['#6F1018', '#C9A24A', '#9B2C35', '#D98E04'][i % 4]}
          />
        ))}
        {person(42, 1.05, '#4F0B11')}
        {person(58, 0.95, '#1F1415')}
      </>
    ),
  },
}

export default function Polaroid({
  scene,
  caption,
  stamp = "'26 10 03",
  className = '',
}: {
  scene: SceneId
  caption: string
  stamp?: string
  className?: string
}) {
  const s = SCENES[scene]
  return (
    <figure className={`bg-white p-2.5 pb-0 shadow-[0_20px_50px_-12px_rgba(31,20,21,0.45)] ${className}`}>
      <div className="relative aspect-square overflow-hidden" style={{ background: s.bg }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
          {s.draw}
        </svg>
        {/* film grain + vignette */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.22] mix-blend-overlay" aria-hidden>
          <filter id={`grain-${scene}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${scene})`} />
        </svg>
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]" />
        <span className="absolute bottom-1.5 right-2 font-mono text-[10px] font-bold text-[#FF9A3C] [text-shadow:0_0_4px_rgba(255,110,20,0.9)]">
          {stamp}
        </span>
      </div>
      <figcaption className="py-2.5 text-center font-hand text-xl leading-none text-ink">{caption}</figcaption>
    </figure>
  )
}
