import { Suspense } from "react"
import { BookingWizard } from "@/components/booking-wizard"

export const metadata = { title: "Book a visit" }

export default function BookPage() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-ink-soft">Opening the book…</p>}>
      <BookingWizard />
    </Suspense>
  )
}
