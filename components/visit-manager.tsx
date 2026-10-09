"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/client/api"
import { addDays, localDate } from "@/lib/domain/time"
import type { AppointmentView, Catalog, Slot } from "@/lib/domain/types"
import { formatDayLabel, formatTime, formatWhen } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { FormError } from "@/components/ui"

export function VisitManager({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [visit, setVisit] = useState<AppointmentView | null>(null)
  const [missing, setMissing] = useState(false)
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [moving, setMoving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api<Catalog>("/api/catalog"), api<AppointmentView>(`/api/appointments/${token}`)])
      .then(([nextCatalog, nextVisit]) => {
        if (cancelled) return
        setCatalog(nextCatalog)
        setVisit(nextVisit)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setMissing(true)
        setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!moving || !catalog || !visit) return
    let cancelled = false
    const from = localDate(new Date(), catalog.clinic.timezone)
    const to = addDays(from, catalog.clinic.bookingWindowDays)
    api<Slot[]>(`/api/slots?dentistId=${visit.dentistId}&serviceId=${visit.serviceId}&from=${from}&to=${to}`)
      .then((result) => {
        if (!cancelled) setSlots(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [moving, catalog, visit])

  const grouped = useMemo(() => {
    if (!catalog || !slots) return []
    const map = new Map<string, Slot[]>()
    for (const slot of slots) {
      const key = localDate(new Date(slot.startsAt), catalog.clinic.timezone)
      const list = map.get(key) ?? []
      list.push(slot)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [catalog, slots])

  async function reschedule(startsAt: string) {
    setPending(true)
    setError(null)
    try {
      const next = await api<AppointmentView>(`/api/appointments/${token}/reschedule`, {
        method: "POST",
        body: { startsAt },
      })
      setVisit(next)
      setMoving(false)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  async function cancel() {
    setPending(true)
    setError(null)
    try {
      const next = await api<AppointmentView>(`/api/appointments/${token}/cancel`, { method: "POST" })
      setVisit(next)
      setConfirmCancel(false)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-2xl px-6 py-12">
        {missing ? (
          <div>
            <h1 className="font-serif text-5xl">We could not find that visit.</h1>
            <p className="mt-4 text-ink-soft">The link may be old, or the demo was reset in this browser.</p>
            <Link className="btn mt-8" href="/book">
              Book again
            </Link>
          </div>
        ) : null}
        {!visit && !missing ? <p className="text-ink-soft">Finding the visit…</p> : null}
        {visit && catalog ? (
          <div className="sheet p-6 md:p-8">
            <p className="eyebrow">{visit.status === "booked" ? "Upcoming" : visit.status}</p>
            <h1 className="mt-2 font-serif text-4xl">{visit.serviceName}</h1>
            <p className="mt-3 text-lg">Dr. {visit.dentistName}</p>
            <p className="text-ink-soft">{formatWhen(visit.startsAt, catalog.clinic.timezone)}</p>
            <p className="mt-4 text-sm text-ink-soft">
              {visit.patientName} · {visit.patientEmail}
            </p>
            <FormError message={error} />
            {visit.status === "booked" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setMoving((value) => !value)}>
                  {moving ? "Keep this time" : "Choose a new time"}
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmCancel(true)}>
                  Cancel visit
                </button>
              </div>
            ) : (
              <p className="mt-6 text-sm text-ink-soft">This visit is no longer on the active book.</p>
            )}
            {confirmCancel && visit.status === "booked" ? (
              <div className="mt-4 rounded-2xl bg-paper-deep p-4">
                <p>Cancel this visit and free the chair?</p>
                <button type="button" className="btn mt-3" disabled={pending} onClick={() => void cancel()}>
                  Yes, cancel it
                </button>
              </div>
            ) : null}
            {moving ? (
              <div className="mt-6">
                {!slots ? <p className="text-sm text-ink-soft">Checking open chairs…</p> : null}
                {slots && grouped.length === 0 ? <p className="text-sm text-ink-soft">No other time is open.</p> : null}
                {grouped.map(([day, daySlots]) => (
                  <div key={day} className="mt-4">
                    <p className="text-sm text-ink-soft">{formatDayLabel(day, catalog.clinic.timezone)}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {daySlots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          className="slot"
                          disabled={pending}
                          onClick={() => void reschedule(slot.startsAt)}
                        >
                          {formatTime(slot.startsAt, catalog.clinic.timezone)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  )
}
