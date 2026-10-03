import type { FilmStyle } from './types'

const MAX_EDGE = 1600

export const FILM_STYLES: { id: FilmStyle; name: string; blurb: string }[] = [
  { id: 'classic', name: 'Classic 35mm', blurb: 'Warm, faded, a touch of grain' },
  { id: 'golden', name: 'Golden Hour', blurb: 'Rich, sunny, extra warm' },
  { id: 'bw', name: 'Black & White', blurb: 'Timeless, high contrast' },
]

/** Per-channel lookup tables, so the pixel loop is just three array reads. */
function buildLut(film: FilmStyle): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const r = new Uint8ClampedArray(256)
  const g = new Uint8ClampedArray(256)
  const b = new Uint8ClampedArray(256)
  const contrast = (v: number, k: number) => (v - 128) * k + 128
  for (let i = 0; i < 256; i++) {
    if (film === 'golden') {
      r[i] = contrast(i, 1.08) * 1.08 + 14
      g[i] = contrast(i, 1.08) * 1.02 + 6
      b[i] = contrast(i, 1.08) * 0.8 + 4
    } else if (film === 'bw') {
      const v = contrast(i, 1.18) + 4
      r[i] = g[i] = b[i] = v
    } else {
      // classic: lifted blacks (faded film) and a warm cast
      const v = contrast(i, 1.1) * 0.92 + 16
      r[i] = v * 1.06 + 4
      g[i] = v * 1.01 + 2
      b[i] = v * 0.9 + 6
    }
  }
  return [r, g, b]
}

function applyFilm(ctx: CanvasRenderingContext2D, w: number, h: number, film: FilmStyle) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const [lr, lg, lb] = buildLut(film)
  const cx = w / 2
  const cy = h / 2
  const maxDist2 = cx * cx + cy * cy
  const vignette = film === 'bw' ? 0.5 : 0.42
  const grain = film === 'bw' ? 22 : 16

  for (let y = 0; y < h; y++) {
    const dy2 = (y - cy) * (y - cy)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      let r = d[i]
      let g = d[i + 1]
      let b = d[i + 2]
      if (film === 'bw') {
        r = g = b = 0.299 * r + 0.587 * g + 0.114 * b
      }
      const fall = 1 - vignette * (((x - cx) * (x - cx) + dy2) / maxDist2) ** 1.4
      const noise = (Math.random() - 0.5) * grain
      d[i] = lr[r | 0] * fall + noise
      d[i + 1] = lg[g | 0] * fall + noise
      d[i + 2] = lb[b | 0] * fall + noise
    }
  }
  ctx.putImageData(img, 0, 0)

  if (film !== 'bw') {
    // Light leak from a random edge, like a real cheap camera.
    const fromLeft = Math.random() < 0.5
    const gx = fromLeft ? 0 : w
    const gy = h * (0.2 + Math.random() * 0.6)
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w * 0.55)
    grad.addColorStop(0, 'rgba(255, 120, 40, 0.32)')
    grad.addColorStop(0.5, 'rgba(255, 60, 30, 0.10)')
    grad.addColorStop(1, 'rgba(255, 60, 30, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
}

function drawDateStamp(ctx: CanvasRenderingContext2D, w: number, h: number, when: Date) {
  const yy = String(when.getFullYear()).slice(2)
  const mm = String(when.getMonth() + 1).padStart(2, '0')
  const dd = String(when.getDate()).padStart(2, '0')
  const text = `'${yy} ${mm} ${dd}`
  const size = Math.round(Math.min(w, h) * 0.045)
  ctx.font = `bold ${size}px "Courier New", ui-monospace, monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(255, 110, 20, 0.9)'
  ctx.shadowBlur = size * 0.4
  ctx.fillStyle = '#FF9A3C'
  ctx.fillText(text, w - size * 1.2, h - size * 0.9)
  ctx.shadowBlur = 0
}

/** Width ÷ height of the photo frame for a given camera feed. */
export function viewfinderAspect(vw: number, vh: number): number {
  return vh > vw ? 3 / 4 : 4 / 3
}

/** Grab the current video frame, develop it with the event's film style, return a JPEG. */
export async function capturePhoto(
  video: HTMLVideoElement,
  opts: { film: FilmStyle; dateStamp: boolean },
): Promise<Blob> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) throw new Error('Camera not ready')
  // Center-crop to 3:4 (portrait) or 4:3 (landscape), matching the viewfinder.
  const aspect = viewfinderAspect(vw, vh)
  let sw = vw
  let sh = vh
  if (vw / vh > aspect) sw = Math.round(vh * aspect)
  else sh = Math.round(vw / aspect)
  const sx = Math.round((vw - sw) / 2)
  const sy = Math.round((vh - sh) / 2)

  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh))
  const w = Math.round(sw * scale)
  const h = Math.round(sh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h)
  applyFilm(ctx, w, h, opts.film)
  if (opts.dateStamp) drawDateStamp(ctx, w, h, new Date())

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save photo'))), 'image/jpeg', 0.85),
  )
}
