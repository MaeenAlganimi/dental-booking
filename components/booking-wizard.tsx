"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/client/api"
import { addDays, localDate } from "@/lib/domain/time"
import type { AppointmentView, Catalog, Dentist, Service, Slot } from "@/lib/domain/types"
import { formatDayLabel, formatPrice, formatTime, formatWhen } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Field, FormError } from "@/components/ui"

type Step = "service" | "dentist" | "time" | "details" | "done"

export function BookingWizard() {
  const params = useSearchParams()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(params.get("service"))
  const [dentistId, setDentistId] = useState<string | null>(params.get("dentist"))
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [form, setForm] = useState({ patientName: "", patientEmail: "", patientPhone: "", notes: "" })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [booked, setBooked] = useState<AppointmentView | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Catalog>("/api/catalog")
      .then((result) => {
        if (!cancelled) setCatalog(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const service = catalog?.services.find((item) => item.id === serviceId) ?? null
  const dentists = useMemo(() => {
    if (!catalog || !service) return []
    return catalog.dentists.filter((dentist) =>
      catalog.dentistServices.some((link) => link.dentistId === dentist.id && link.serviceId === service.id),
    )
  }, [catalog, service])
  const dentist = dentists.find((item) => item.id === dentistId) ?? null

  useEffect(() => {
    if (!catalog || !service || !dentist) return
    let cancelled = false
    const from = localDate(new Date(), catalog.clinic.timezone)
    const to = addDays(from, catalog.clinic.bookingWindowDays)
    api<Slot[]>(`/api/slots?dentistId=${dentist.id}&serviceId=${service.id}&from=${from}&to=${to}`)
      .then((result) => {
        if (!cancelled) setSlots(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [catalog, service, dentist])

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

  const activeDate = date && grouped.some(([key]) => key === date) ? date : (grouped[0]?.[0] ?? null)
  const daySlots = grouped.find(([key]) => key === activeDate)?.[1] ?? []
  const step: Step = booked ? "done" : !service ? "service" : !dentist ? "dentist" : !startsAt ? "time" : "details"

  function chooseService(next: Service) {
    setServiceId(next.id)
    setDentistId((current) => {
      if (!catalog) return null
      const stillOffered = catalog.dentistServices.some((link) => link.dentistId === current && link.serviceId === next.id)
      return stillOffered ? current : null
    })
    setSlots(null)
    setStartsAt(null)
    setError(null)
  }

  function chooseDentist(next: Dentist) {
    setDentistId(next.id)
    setSlots(null)
    setStartsAt(null)
    setError(null)
  }

  async function confirm() {
    if (!service || !dentist || !startsAt) return
    setPending(true)
    setError(null)
    try {
      const visit = await api<AppointmentView>("/api/appointments", {
        method: "POST",
        body: {
          serviceId: service.id,
          dentistId: dentist.id,
          startsAt,
          ...form,
        },
      })
      setBooked(visit)
    } catch (caught) {
      setError(messageOf(caught))
      setStartsAt(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="eyebrow">Book</p>
          <h1 className="mt-2 font-serif text-4xl">Hold a chair</h1>
          <ol className="mt-6 space-y-2 text-sm">
            <SummaryLine label="Service" value={service?.name} />
            <SummaryLine label="Dentist" value={dentist ? `Dr. ${dentist.name}` : null} />
            <SummaryLine
              label="Time"
              value={catalog && startsAt ? formatWhen(startsAt, catalog.clinic.timezone) : null}
            />
          </ol>
        </aside>

        <section className="sheet p-6 md:p-8">
          {!catalog && !error ? <p className="text-ink-soft">Opening the book…</p> : null}
          <FormError message={error} />

          {catalog && step === "service" ? (
            <div>
              <h2 className="font-serif text-3xl">What do you need?</h2>
              <div className="mt-6 grid gap-3">
                {catalog.services.map((item) => (
                  <button key={item.id} type="button" className="choice" onClick={() => chooseService(item)}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-ink-soft">
                        {item.durationMinutes} min · {formatPrice(item.priceCents)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-ink-soft">{item.summary}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {catalog && step === "dentist" && service ? (
            <div>
              <h2 className="font-serif text-3xl">Who should you see?</h2>
              <div className="mt-6 grid gap-3">
                {dentists.map((item) => (
                  <button key={item.id} type="button" className="choice" onClick={() => chooseDentist(item)}>
                    <span className="flex items-center gap-3">
                      <span className="h-10 w-1.5 rounded-full" style={{ background: item.color }} />
                      <span>
                        <span className="block font-medium">
                          Dr. {item.name}, {item.credentials}
                        </span>
                        <span className="text-sm text-brass">{item.focus}</span>
                      </span>
                    </span>
                    <span className="mt-2 block text-sm text-ink-soft">{item.bio}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-quiet mt-4" onClick={() => setServiceId(null)}>
                Different service
              </button>
            </div>
          ) : null}

          {catalog && step === "time" && service && dentist ? (
            <div>
              <h2 className="font-serif text-3xl">When works?</h2>
              <p className="mt-2 text-sm text-ink-soft">
                {service.durationMinutes} minutes with Dr. {dentist.name}. Times are Pacific.
              </p>
              {!slots ? <p className="mt-6 text-sm text-ink-soft">Checking open chairs…</p> : null}
              {slots && grouped.length === 0 ? (
                <p className="mt-6 text-sm text-ink-soft">Nothing is open in the next {catalog.clinic.bookingWindowDays} days.</p>
              ) : null}
              {grouped.length > 0 ? (
                <>
                  <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                    {grouped.map(([key]) => (
                      <button
                        key={key}
                        type="button"
                        className="day-chip shrink-0 px-3"
                        aria-pressed={key === activeDate}
                        onClick={() => setDate(key)}
                      >
                        {formatDayLabel(key, catalog.clinic.timezone)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        className="slot"
                        data-testid="slot"
                        onClick={() => {
                          setStartsAt(slot.startsAt)
                          setError(null)
                        }}
                      >
                        {formatTime(slot.startsAt, catalog.clinic.timezone)}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <button type="button" className="btn btn-quiet mt-4" onClick={() => setDentistId(null)}>
                Different dentist
              </button>
            </div>
          ) : null}

          {catalog && step === "details" && service && dentist && startsAt ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void confirm()
              }}
            >
              <h2 className="font-serif text-3xl">Who is coming in?</h2>
              <p className="text-sm text-ink-soft">{formatWhen(startsAt, catalog.clinic.timezone)}</p>
              <Field label="Name">
                <input
                  required
                  name="patientName"
                  autoComplete="name"
                  value={form.patientName}
                  onChange={(event) => setForm({ ...form, patientName: event.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  name="patientEmail"
                  autoComplete="email"
                  value={form.patientEmail}
                  onChange={(event) => setForm({ ...form, patientEmail: event.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  required
                  type="tel"
                  name="patientPhone"
                  autoComplete="tel"
                  value={form.patientPhone}
                  onChange={(event) => setForm({ ...form, patientPhone: event.target.value })}
                />
              </Field>
              <Field label="Notes" hint="Optional. Allergies, a preference, or who is bringing a child.">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? "Holding the chair…" : "Confirm visit"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setStartsAt(null)}>
                  Different time
                </button>
              </div>
            </form>
          ) : null}

          {booked && catalog ? (
            <div>
              <p className="eyebrow">Confirmed</p>
              <h2 className="mt-2 font-serif text-4xl">You are on the book.</h2>
              <p className="mt-4 text-lg">
                {booked.serviceName} with Dr. {booked.dentistName}
              </p>
              <p className="mt-1 text-ink-soft">{formatWhen(booked.startsAt, catalog.clinic.timezone)}</p>
              <p className="mt-6 text-sm leading-relaxed text-ink-soft">
                Keep this link. It is the only way to move or cancel without calling the desk. In this demo the reminder
                is recorded, not emailed.
              </p>
              <p className="mt-4 break-all">
                <Link className="underline" href={`/visit/${booked.manageToken}`} data-testid="manage-link">
                  {`/visit/${booked.manageToken}`}
                </Link>
              </p>
              <Link className="btn mt-6" href={`/visit/${booked.manageToken}`}>
                Open the visit
              </Link>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function SummaryLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <li className="flex justify-between gap-4 border-t border-line py-2">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </li>
  )
}
