import { isDemoMode } from "@/lib/config"

export function DemoBanner() {
  if (!isDemoMode()) return null
  return (
    <p className="bg-pine-deep px-4 py-2 text-center text-sm text-paper">
      Demo clinic. Bookings stay in this browser. Reminders are recorded on the desk, not emailed.
    </p>
  )
}
