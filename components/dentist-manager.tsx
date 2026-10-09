"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client/api"
import type { Dentist, Directory, Service } from "@/lib/domain/types"
import { messageOf } from "@/lib/errors"
import { Field, FormError } from "@/components/ui"

const empty = {
  id: undefined as string | undefined,
  name: "",
  credentials: "DDS",
  focus: "",
  bio: "",
  color: "#1b4a38",
  active: true,
  serviceIds: [] as string[],
}

export function DentistManager() {
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

  function edit(dentist: Dentist, services: Service[], links: Directory["dentistServices"]) {
    setForm({
      id: dentist.id,
      name: dentist.name,
      credentials: dentist.credentials,
      focus: dentist.focus,
      bio: dentist.bio,
      color: dentist.color,
      active: dentist.active,
      serviceIds: links.filter((link) => link.dentistId === dentist.id).map((link) => link.serviceId).filter((id) => services.some((service) => service.id === id)),
    })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api("/api/staff/dentists", { method: "POST", body: form })
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
        <p className="eyebrow">Roster</p>
        <h1 className="font-serif text-4xl">Dentists</h1>
        <ul className="mt-6">
          {directory?.dentists.map((dentist) => (
            <li key={dentist.id} className="menu-row items-center">
              <div>
                <p className="font-medium">
                  Dr. {dentist.name}, {dentist.credentials}
                </p>
                <p className="text-sm text-ink-soft">
                  {dentist.focus}
                  {dentist.active ? "" : " · hidden from the book"}
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => directory && edit(dentist, directory.services, directory.dentistServices)}>
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form className="sheet grid gap-3 p-5" onSubmit={(event) => void save(event)}>
        <h2 className="font-serif text-2xl">{form.id ? "Edit dentist" : "Add dentist"}</h2>
        <Field label="Name">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label="Credentials">
          <input required value={form.credentials} onChange={(event) => setForm({ ...form, credentials: event.target.value })} />
        </Field>
        <Field label="Focus">
          <input required value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} />
        </Field>
        <Field label="Bio">
          <textarea required value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
        </Field>
        <Field label="Color">
          <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
        </Field>
        <fieldset>
          <legend className="eyebrow">Services</legend>
          <div className="mt-2 grid gap-1">
            {directory?.services.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.serviceIds.includes(service.id)}
                  onChange={(event) => {
                    const serviceIds = event.target.checked
                      ? [...form.serviceIds, service.id]
                      : form.serviceIds.filter((id) => id !== service.id)
                    setForm({ ...form, serviceIds })
                  }}
                />
                {service.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          Visible to patients
        </label>
        <FormError message={error} />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save dentist"}
        </button>
      </form>
    </section>
  )
}
