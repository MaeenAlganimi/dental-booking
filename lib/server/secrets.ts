import "server-only"
import { isDemoMode } from "@/lib/config"

export function demoStaffCredentials(): { email: string; password: string; name: string } {
  return {
    email: process.env.DEMO_STAFF_EMAIL || "staff@whitmore.dental",
    password: process.env.DEMO_STAFF_PASSWORD || "whitmore-demo",
    name: "Maeen Alganimi",
  }
}

/** Production must set CRON_SECRET. Demo mode accepts a published default. */
export function cronSecret(): string | null {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET
  if (isDemoMode()) return "demo-cron-secret"
  return null
}
