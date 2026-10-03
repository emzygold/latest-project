import { useEffect, useState } from 'react'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Ticks every second; calls onDone once the target time passes. */
export default function Countdown({ target, onDone }: { target: string; onDone?: () => void }) {
  const [now, setNow] = useState(Date.now())
  const remaining = new Date(target).getTime() - now

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (remaining <= 0) onDone?.()
  }, [remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const { d, h, m, s } = parts(remaining)
  const cells = [
    ...(d > 0 ? [{ v: d, l: 'days' }] : []),
    { v: h, l: 'hours' },
    { v: m, l: 'min' },
    { v: s, l: 'sec' },
  ]
  return (
    <div className="flex justify-center gap-3">
      {cells.map((c) => (
        <div key={c.l} className="w-16 rounded-xl bg-night-card py-3 text-center">
          <div className="font-mono text-2xl font-semibold text-gold tabular-nums">{String(c.v).padStart(2, '0')}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-night-ink/60">{c.l}</div>
        </div>
      ))}
    </div>
  )
}
