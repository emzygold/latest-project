export default function Spinner({ label = 'Loading…', dark = false }: { label?: string; dark?: boolean }) {
  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center gap-4 ${dark ? 'bg-night text-night-ink' : ''}`}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-primary" />
      <p className={`text-sm ${dark ? 'text-night-ink/70' : 'text-ink-2'}`}>{label}</p>
    </div>
  )
}
