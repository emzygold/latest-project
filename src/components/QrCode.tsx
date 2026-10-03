import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function useQrDataUrl(text: string, size = 600): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1F1415', light: '#FFFFFF' },
    }).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [text, size])
  return url
}

export default function QrCode({ text, className = '' }: { text: string; className?: string }) {
  const url = useQrDataUrl(text)
  if (!url) return <div className={`aspect-square animate-pulse rounded-xl bg-line ${className}`} />
  return <img src={url} alt="QR code to join the event" className={`aspect-square ${className}`} />
}
