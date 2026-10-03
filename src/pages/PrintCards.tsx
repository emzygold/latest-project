import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQrDataUrl } from '../components/QrCode'
import Spinner from '../components/Spinner'
import { store } from '../lib/store'
import type { EventInfo } from '../lib/types'
import { formatEventDate, guestUrl } from '../lib/util'

/** Four A6 table cards on one A4 sheet. Print, cut along the lines, place on tables. */
export default function PrintCards() {
  const { code = '' } = useParams()
  const [event, setEvent] = useState<EventInfo | null | undefined>(undefined)
  const qr = useQrDataUrl(guestUrl(code), 800)

  useEffect(() => {
    store.getEvent(code).then(setEvent)
  }, [code])

  if (event === undefined || !qr) return <Spinner label="Preparing cards…" />
  if (event === null) return <p className="p-10 text-center">Event not found.</p>

  return (
    <div className="min-h-dvh bg-page print:bg-white">
      <style>{`@page { size: A4; margin: 0; }`}</style>
      <div className="no-print mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-5">
        <Link to={`/host/${code}`} className="text-sm font-semibold text-primary">
          ← Back to dashboard
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          Print cards
        </button>
        <p className="w-full text-sm text-ink-2">
          Prints 4 cards per A4 sheet. Use thick paper (250gsm+) and cut along the faint lines.
        </p>
      </div>

      <div className="overflow-x-auto pb-8 print:overflow-visible print:pb-0">
      <div className="mx-auto grid h-[297mm] w-[210mm] grid-cols-2 grid-rows-2 bg-white shadow-xl print:shadow-none">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} event={event} qr={qr} />
        ))}
      </div>
      </div>
    </div>
  )
}

function Card({ event, qr }: { event: EventInfo; qr: string }) {
  return (
    <div className="flex flex-col items-center justify-between border border-dashed border-line px-[10mm] py-[11mm] text-center">
      <div>
        <p className="text-[9pt] font-semibold uppercase tracking-[0.3em] text-gold">Be our photographer</p>
        <h2 className="heading mt-[3mm] text-[22pt] leading-tight text-primary">{event.title}</h2>
        <p className="mt-[1mm] text-[9pt] text-ink-2">{formatEventDate(event.eventDate)}</p>
      </div>
      <div className="rounded-[3mm] border-[0.6mm] border-primary p-[2.5mm]">
        <img src={qr} alt="" className="h-[52mm] w-[52mm]" />
      </div>
      <div>
        <p className="heading text-[15pt] italic text-ink">Scan to open the camera</p>
        <p className="mt-[1.5mm] text-[8.5pt] text-ink-2">
          No app needed · {event.shotsPerGuest} shots each · photos develop later
        </p>
      </div>
    </div>
  )
}
