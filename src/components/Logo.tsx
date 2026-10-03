import { Link } from 'react-router-dom'

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#6F1018" />
        <rect x="12" y="20" width="40" height="28" rx="5" fill="none" stroke="#F5EDEE" strokeWidth="3" />
        <circle cx="32" cy="34" r="8" fill="none" stroke="#C9A24A" strokeWidth="3" />
        <rect x="18" y="15" width="10" height="5" rx="1.5" fill="#F5EDEE" />
        <circle cx="45" cy="26" r="2" fill="#C9A24A" />
      </svg>
      <span className={`heading text-2xl ${light ? 'text-night-ink' : 'text-ink'}`}>FlashBack</span>
    </Link>
  )
}
