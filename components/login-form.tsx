"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { api } from "@/lib/client/api"
import { messageOf } from "@/lib/errors"
import { Field, FormError } from "@/components/ui"

export function LoginForm({ hint }: { hint: { email: string; password: string } | null }) {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(hint?.email ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api("/api/auth/login", { method: "POST", auth: true, body: { email, password } })
      router.push(params.get("next") || "/dashboard")
      router.refresh()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <main id="content" className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <div>
        <p className="eyebrow">Staff desk</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight">The day, without the front-desk pile.</h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Appointments, hours, and the reminder log live here. Patients never see this page.
        </p>
      </div>
      <form className="sheet grid gap-4 p-6" onSubmit={(event) => void submit(event)}>
        <Field label="Email">
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {hint ? (
          <p className="text-sm text-ink-soft">
            Demo desk: {hint.email} / {hint.password}
          </p>
        ) : null}
        <FormError message={error} />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  )
}
