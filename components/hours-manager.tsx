"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import { timeToMinutes } from "@/lib/domain/time"
import type { Directory } from "@/lib/domain/types"
import { WEEKDAYS, formatMinutes, formatWhen } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { Field, FormError } from "@/components/ui"

const order = [1, 2, 3, 4, 5, 6, 0]

type WindowForm = { open: boolean; start: string; end: string }

function blankWeek(): Record<number, WindowForm> {
  return Object.fromEntries(order.map((day) => [day, { open: false, start: "09:00", end: "17:00" }])) as Record<number, WindowForm>
}

export function HoursManager() {
  const [directory, setDirectory] = useState<Directory | null>(null)
  const [dentistId, setDentistId] = useState("")
  const [week, setWeek] = useState<Record<number, WindowForm>>(blankWeek)
  const [closure, setClosure] = useState({ date: "", start: "13:00", end: "17:00", reason: "" })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function reload() {
    const next = await api<Directory>("/api/staff/directory")
    setDirectory(next)
    setDentistId((current) => current || next.dentists[0]?.id || "")
  }

  useEffect(() => {
    let cancelled = false
    api<Directory>("/api/staff/directory")
      .then((next) => {
        if (cancelled) return
        setDirectory(next)
        setDentistId((current) => current || next.dentists[0]?.id || "")
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hoursSignature = directory
    ? directory.workingHours
        .filter((hour) => hour.dentistId === dentistId)
        .map((hour) => `${hour.weekday}:${hour.startMinute}:${hour.endMinute}`)
        .join("|")
    : ""
  const [loadedSignature, setLoadedSignature] = useState<string | null>(null)
  if (hoursSignature !== loadedSignature) {
    setLoadedSignature(hoursSignature)
    const next = blankWeek()
    for (const hour of directory?.workingHours.filter((item) => item.dentistId === dentistId) ?? []) {
      next[hour.weekday] = {
        open: true,
        start: minutesToInput(hour.startMinute),
        end: minutesToInput(hour.endMinute),
      }
    }
    setWeek(next)
  }

  async function saveHours(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const hours = order
        .filter((day) => week[day]?.open)
        .map((day) => ({
          weekday: day,
          startMinute: timeToMinutes(week[day].start),
          endMinute: timeToMinutes(week[day].end),
        }))
      await api("/api/staff/hours", { method: "PUT", body: { dentistId, hours } })
      await reload()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  async function addClosure(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api("/api/staff/time-off", {
        method: "POST",
        body: {
          dentistId,
          date: closure.date,
          startMinute: timeToMinutes(closure.start),
          endMinute: timeToMinutes(closure.end),
          reason: closure.reason,
        },
      })
      setClosure({ date: "", start: "13:00", end: "17:00", reason: "" })
      await reload()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  async function removeClosure(id: string) {
    setError(null)
    try {
      await api(`/api/staff/time-off/${id}`, { method: "DELETE" })
      await reload()
    } catch (caught) {
      setError(messageOf(caught))
    }
  }

  const timeZone = "America/Los_Angeles"
  const closures = directory?.timeOff.filter((item) => item.dentistId === dentistId) ?? []

  return (
    <section>
      <p className="eyebrow">Schedule</p>
      <h1 className="font-serif text-4xl">Hours and closed slots</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Open hours decide which chairs are offered. A closure removes a stretch of an otherwise open day.
      </p>
      <label className="field mt-6 max-w-xs">
        <span>Dentist</span>
        <select value={dentistId} onChange={(event) => setDentistId(event.target.value)}>
          {directory?.dentists.map((dentist) => (
            <option key={dentist.id} value={dentist.id}>
              Dr. {dentist.name}
            </option>
          ))}
        </select>
      </label>
      <form className="mt-6 grid gap-3" onSubmit={(event) => void saveHours(event)}>
        {order.map((day) => (
          <div key={day} className="grid items-center gap-3 border-t border-line py-3 sm:grid-cols-[140px_80px_1fr_1fr]">
            <span>{WEEKDAYS[day]}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={week[day]?.open ?? false}
                onChange={(event) => setWeek({ ...week, [day]: { ...week[day], open: event.target.checked } })}
              />
              Open
            </label>
            <input
              type="time"
              value={week[day]?.start ?? "09:00"}
              onChange={(event) => setWeek({ ...week, [day]: { ...week[day], start: event.target.value } })}
              disabled={!week[day]?.open}
            />
            <input
              type="time"
              value={week[day]?.end ?? "17:00"}
              onChange={(event) => setWeek({ ...week, [day]: { ...week[day], end: event.target.value } })}
              disabled={!week[day]?.open}
            />
          </div>
        ))}
        <button className="btn mt-2 w-fit" type="submit" disabled={pending || !dentistId}>
          Save hours
        </button>
      </form>

      <form className="sheet mt-10 grid gap-3 p-5" onSubmit={(event) => void addClosure(event)}>
        <h2 className="font-serif text-2xl">Close a slot</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Date">
            <input required type="date" value={closure.date} onChange={(event) => setClosure({ ...closure, date: event.target.value })} />
          </Field>
          <Field label="From">
            <input required type="time" value={closure.start} onChange={(event) => setClosure({ ...closure, start: event.target.value })} />
          </Field>
          <Field label="Until">
            <input required type="time" value={closure.end} onChange={(event) => setClosure({ ...closure, end: event.target.value })} />
          </Field>
          <Field label="Reason">
            <input required value={closure.reason} onChange={(event) => setClosure({ ...closure, reason: event.target.value })} />
          </Field>
        </div>
        <button className="btn w-fit" type="submit" disabled={pending || !dentistId}>
          Add closure
        </button>
      </form>
      <ul className="mt-4">
        {closures.map((item) => (
          <li key={item.id} className="menu-row items-center">
            <div>
              <p>{formatWhen(item.startsAt, timeZone)} – {formatMinutesLabel(item.endsAt, timeZone)}</p>
              <p className="text-sm text-ink-soft">{item.reason}</p>
            </div>
            <button type="button" className="btn btn-quiet" onClick={() => void removeClosure(item.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <FormError message={error} />
    </section>
  )
}

function minutesToInput(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function formatMinutesLabel(iso: string, timeZone: string): string {
  return formatWhen(iso, timeZone).split("·").pop()?.trim() || formatMinutes(0)
}
