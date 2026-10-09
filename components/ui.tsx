import type { ReactNode } from "react"

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small className="text-sm normal-case tracking-normal text-ink-soft">{hint}</small> : null}
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-clay">
      {message}
    </p>
  )
}
