"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import type { ReminderDraft, ReminderLog } from "@/lib/domain/types"
import { formatWhen } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { FormError } from "@/components/ui"

export function ReminderPanel() {
  const [due, setDue] = useState<ReminderDraft[] | null>(null)
  const [log, setLog] = useState<ReminderLog[] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<{ reminders: ReminderDraft[] }>("/api/reminders/due")
      .then(async (dueResult) => {
        const entries = await api<ReminderLog[]>("/api/staff/reminders")
        if (!cancelled) {
          setDue(dueResult.reminders)
          setLog(entries)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function send() {
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const sent = await api<ReminderLog[]>("/api/cron/reminders", { method: "POST" })
      setNotice(sent.length === 0 ? "No reminders were due." : `Recorded ${sent.length} reminder${sent.length === 1 ? "" : "s"}.`)
      const dueResult = await api<{ reminders: ReminderDraft[] }>("/api/reminders/due")
      const entries = await api<ReminderLog[]>("/api/staff/reminders")
      setDue(dueResult.reminders)
      setLog(entries)
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <section>
      <p className="eyebrow">Reminders</p>
      <h1 className="font-serif text-4xl">A day before the chair</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
        Visits inside the next 24 hours, still booked, and not yet reminded. n8n can send the email and call the
        mark-sent webhook. This button is the in-app fallback: it writes the same message to the log.
      </p>
      <button type="button" className="btn mt-6" disabled={pending} onClick={() => void send()}>
        {pending ? "Sending…" : "Send due reminders"}
      </button>
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      <FormError message={error} />
      <h2 className="mt-10 font-serif text-2xl">Due now</h2>
      {!due ? <p className="mt-3 text-sm text-ink-soft">Checking…</p> : null}
      {due && due.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Nothing is waiting.</p> : null}
      <ul>
        {due?.map((item) => (
          <li key={item.id} className="border-t border-line py-3">
            <p className="font-medium">{item.patientName}</p>
            <p className="text-sm text-ink-soft">
              {item.serviceName} · {formatWhen(item.startsAt, "America/Los_Angeles")}
            </p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-serif text-2xl">Log</h2>
      <ul>
        {log?.map((entry) => (
          <li key={entry.id} className="border-t border-line py-4" data-testid="reminder-log">
            <p className="text-sm text-brass">{entry.channel === "n8n" ? "n8n" : "In-app fallback"}</p>
            <p className="font-medium">{entry.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink-soft">{entry.body}</pre>
          </li>
        ))}
      </ul>
      {log && log.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No reminders recorded yet.</p> : null}
    </section>
  )
}
