"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import { addDays, localDate } from "@/lib/domain/time"
import type { Catalog, Slot } from "@/lib/domain/types"
import { formatTime, formatDayLabel } from "@/lib/format"
import { messageOf } from "@/lib/errors"

type Opening = {
  dentistId: string
  dentistName: string
  color: string
  slot: Slot
}

export function NextOpenings() {
  const [openings, setOpenings] = useState<Opening[] | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [timeZone, setTimeZone] = useState("America/Los_Angeles")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const catalog = await api<Catalog>("/api/catalog")
        const service = catalog.services.find((item) => item.name === "Routine cleaning") ?? catalog.services[0]
        if (!service) {
          if (!cancelled) setOpenings([])
          return
        }
        const from = localDate(new Date(), catalog.clinic.timezone)
        const to = addDays(from, 14)
        const dentists = catalog.dentists.filter((dentist) =>
          catalog.dentistServices.some((link) => link.dentistId === dentist.id && link.serviceId === service.id),
        )
        const next: Opening[] = []
        for (const dentist of dentists) {
          const slots = await api<Slot[]>(
            `/api/slots?dentistId=${dentist.id}&serviceId=${service.id}&from=${from}&to=${to}`,
          )
          if (slots[0]) {
            next.push({ dentistId: dentist.id, dentistName: dentist.name, color: dentist.color, slot: slots[0] })
          }
        }
        if (!cancelled) {
          setServiceId(service.id)
          setTimeZone(catalog.clinic.timezone)
          setOpenings(next)
        }
      } catch (caught) {
        if (!cancelled) setError(messageOf(caught))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside className="sheet p-6">
      <p className="eyebrow">Next open chairs</p>
      <h2 className="mt-2 font-serif text-3xl">Routine cleaning</h2>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {!openings && !error ? <p className="mt-6 text-sm text-ink-soft">Checking the book…</p> : null}
      {openings?.length === 0 ? <p className="mt-6 text-sm text-ink-soft">Nothing is open in the next two weeks.</p> : null}
      <ul className="mt-4">
        {openings?.map((opening) => (
          <li key={opening.dentistId} className="border-t border-line py-3">
            <Link
              href={`/book?service=${serviceId}&dentist=${opening.dentistId}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full" style={{ background: opening.color }} />
                <span>
                  <span className="block font-medium">Dr. {opening.dentistName}</span>
                  <span className="text-sm text-ink-soft">
                    {formatDayLabel(localDate(new Date(opening.slot.startsAt), timeZone), timeZone)}
                  </span>
                </span>
              </span>
              <span className="font-serif text-lg">{formatTime(opening.slot.startsAt, timeZone)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
