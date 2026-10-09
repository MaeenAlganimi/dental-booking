"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api, resetDemoState } from "@/lib/client/api"
import { isDemoMode } from "@/lib/config"

const links = [
  ["/dashboard", "Daybook"],
  ["/dashboard/dentists", "Dentists"],
  ["/dashboard/services", "Services"],
  ["/dashboard/hours", "Hours"],
  ["/dashboard/reminders", "Reminders"],
]

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<{ staff: { name: string } | null }>("/api/auth/session", { auth: true })
      .then((result) => {
        if (!cancelled) setName(result.staff?.name ?? null)
      })
      .catch(() => {
        if (!cancelled) setName(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function signOut() {
    await api("/api/auth/logout", { method: "POST", auth: true })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[0.68rem] tracking-[0.22em] text-brass">HALCYON DESK</p>
            <p className="font-serif text-2xl leading-none">Whitmore Dental</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {name ? <span className="hidden text-ink-soft sm:inline">{name}</span> : null}
            {isDemoMode() ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  resetDemoState()
                  window.location.reload()
                }}
              >
                Reset demo
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[160px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {links.map(([href, label]) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm ${active ? "bg-pine text-paper" : "text-ink-soft"}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div id="content">{children}</div>
      </div>
    </div>
  )
}
