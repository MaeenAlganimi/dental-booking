"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import { addDays, localDate } from "@/lib/domain/time"
import type { AppointmentView, Catalog } from "@/lib/domain/types"
import { formatDayLabel, formatTime } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { FormError } from "@/components/ui"

export function Daybook() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [dentistId, setDentistId] = useState("all")
  const [rows, setRows] = useState<AppointmentView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Catalog>("/api/catalog")
      .then((result) => {
        if (cancelled) return
        setCatalog(result)
        setStart(localDate(new Date(), result.clinic.timezone))
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!catalog || !start) return
    let cancelled = false
    const end = addDays(start, 6)
    api<AppointmentView[]>(`/api/staff/appointments?from=${start}&to=${end}`)
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [catalog, start])

  async function setStatus(id: string, status: "completed" | "cancelled") {
    setPendingId(id)
    setError(null)
    try {
      const next = await api<AppointmentView>(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        body: { status },
      })
      setRows((current) => current?.map((row) => (row.id === id ? next : row)) ?? null)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPendingId(null)
    }
  }

  const visible = (rows ?? []).filter((row) => dentistId === "all" || row.dentistId === dentistId)
  const days = groupDays(visible, catalog?.clinic.timezone ?? "America/Los_Angeles")

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Daybook</p>
          <h1 className="font-serif text-4xl">The week</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => start && setStart(addDays(start, -7))}>
            Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => catalog && setStart(localDate(new Date(), catalog.clinic.timezone))}
          >
            This week
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => start && setStart(addDays(start, 7))}>
            Next
          </button>
        </div>
      </div>
      <label className="field mt-6 max-w-xs">
        <span>Dentist</span>
        <select value={dentistId} onChange={(event) => setDentistId(event.target.value)}>
          <option value="all">Everyone</option>
          {catalog?.dentists.map((dentist) => (
            <option key={dentist.id} value={dentist.id}>
              Dr. {dentist.name}
            </option>
          ))}
        </select>
      </label>
      <FormError message={error} />
      {!rows ? <p className="mt-8 text-sm text-ink-soft">Reading the book…</p> : null}
      {rows && visible.length === 0 ? <p className="mt-8 text-sm text-ink-soft">No visits in this week.</p> : null}
      <div className="mt-6">
        {days.map(([day, items]) => (
          <section key={day} className="mt-8">
            <h2 className="font-serif text-2xl">{formatDayLabel(day, catalog?.clinic.timezone ?? "America/Los_Angeles")}</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="daybook-row" data-testid="appointment-row">
                  <time className="font-serif text-xl">{formatTime(item.startsAt, catalog?.clinic.timezone ?? "America/Los_Angeles")}</time>
                  <div className="border-l-4 pl-3" style={{ borderColor: dentistColor(catalog, item.dentistId) }}>
                    <p className="font-medium">{item.patientName}</p>
                    <p className="text-sm text-ink-soft">
                      {item.serviceName} · Dr. {item.dentistName}
                      <span className="ml-2 uppercase tracking-wide">{item.status}</span>
                    </p>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:justify-end">
                    <Link className="btn btn-secondary" href={`/visit/${item.manageToken}`}>
                      Patient link
                    </Link>
                    {item.status === "booked" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={pendingId === item.id}
                          onClick={() => void setStatus(item.id, "completed")}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet"
                          disabled={pendingId === item.id}
                          onClick={() => void setStatus(item.id, "cancelled")}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}

function groupDays(rows: AppointmentView[], timeZone: string): [string, AppointmentView[]][] {
  const map = new Map<string, AppointmentView[]>()
  for (const row of rows) {
    const key = localDate(new Date(row.startsAt), timeZone)
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  return [...map.entries()]
}

function dentistColor(catalog: Catalog | null, dentistId: string): string {
  return catalog?.dentists.find((dentist) => dentist.id === dentistId)?.color ?? "#1b4a38"
}
