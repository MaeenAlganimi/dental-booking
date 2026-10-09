import { Suspense } from "react"
import { VisitManager } from "@/components/visit-manager"

export const metadata = { title: "Your visit" }

export default function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-ink-soft">Finding the visit…</p>}>
      <VisitToken params={params} />
    </Suspense>
  )
}

async function VisitToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <VisitManager token={token} />
}
