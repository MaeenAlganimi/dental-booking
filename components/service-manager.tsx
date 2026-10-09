"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import type { Directory, Service } from "@/lib/domain/types"
import { formatPrice } from "@/lib/format"
import { messageOf } from "@/lib/errors"
import { Field, FormError } from "@/components/ui"

const empty = {
  id: undefined as string | undefined,
  name: "",
  summary: "",
  durationMinutes: 60,
  priceDollars: 100,
  active: true,
}

export function ServiceManager() {
  const [directory, setDirectory] = useState<Directory | null>(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function reload() {
    setDirectory(await api<Directory>("/api/staff/directory"))
  }

  useEffect(() => {
    let cancelled = false
    api<Directory>("/api/staff/directory")
      .then((next) => {
        if (!cancelled) setDirectory(next)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageOf(caught))
      })
    return () => {
      cancelled = true
    }
  }, [])

  function edit(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      summary: service.summary,
      durationMinutes: service.durationMinutes,
      priceDollars: service.priceCents / 100,
      active: service.active,
    })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api("/api/staff/services", {
        method: "POST",
        body: {
          id: form.id,
          name: form.name,
          summary: form.summary,
          durationMinutes: Number(form.durationMinutes),
          priceCents: Math.round(Number(form.priceDollars) * 100),
          active: form.active,
        },
      })
      setForm(empty)
      await reload()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="eyebrow">Menu</p>
        <h1 className="font-serif text-4xl">Services</h1>
        <ul className="mt-6">
          {directory?.services.map((service) => (
            <li key={service.id} className="menu-row items-center">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-ink-soft">
                  {service.durationMinutes} min · {formatPrice(service.priceCents)}
                  {service.active ? "" : " · hidden"}
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => edit(service)}>
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form className="sheet grid gap-3 p-5" onSubmit={(event) => void save(event)}>
        <h2 className="font-serif text-2xl">{form.id ? "Edit service" : "Add service"}</h2>
        <Field label="Name">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label="Summary">
          <textarea required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        </Field>
        <Field label="Minutes">
          <input
            required
            type="number"
            min={15}
            max={240}
            value={form.durationMinutes}
            onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
          />
        </Field>
        <Field label="Price (USD)">
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={form.priceDollars}
            onChange={(event) => setForm({ ...form, priceDollars: Number(event.target.value) })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          Visible to patients
        </label>
        <FormError message={error} />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </button>
      </form>
    </section>
  )
}
