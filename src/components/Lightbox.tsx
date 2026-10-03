import { useEffect, useRef } from 'react'
import type { Photo } from '../lib/types'
import { downloadBlob } from '../lib/util'

interface Props {
  photos: Photo[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

export async function downloadPhoto(photo: Photo) {
  const blob = await fetch(photo.url).then((r) => r.blob())
  await downloadBlob(blob, `flashback-${photo.guestName.replace(/\W+/g, '-')}-${photo.id.slice(0, 6)}.jpg`)
}

export default function Lightbox({ photos, index, onIndex, onClose }: Props) {
  const photo = photos[index]
  const touchX = useRef<number | null>(null)

  const prev = () => index > 0 && onIndex(index - 1)
  const next = () => index < photos.length - 1 && onIndex(index + 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-night/97 text-night-ink"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (dx > 50) prev()
        if (dx < -50) next()
        touchX.current = null
      }}
    >
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-sm font-semibold">{photo.guestName}</p>
          <p className="text-xs text-night-ink/60">
            {new Date(photo.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {index + 1} of{' '}
            {photos.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-night px-4 py-2" onClick={() => downloadPhoto(photo)}>
            Save
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-night-card text-xl"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6">
        <img key={photo.id} src={photo.url} alt={`Photo by ${photo.guestName}`} className="max-h-full max-w-full rounded-md object-contain" />
        {index > 0 && (
          <button onClick={prev} aria-label="Previous" className="absolute left-3 hidden h-12 w-12 items-center justify-center rounded-full bg-night-card/80 text-2xl sm:flex">
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button onClick={next} aria-label="Next" className="absolute right-3 hidden h-12 w-12 items-center justify-center rounded-full bg-night-card/80 text-2xl sm:flex">
            ›
          </button>
        )}
      </div>
    </div>
  )
}
