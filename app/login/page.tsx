import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"
import { isDemoMode } from "@/lib/config"
import { demoStaffCredentials } from "@/lib/server/secrets"

export const metadata = { title: "Staff sign in" }

export default function LoginPage() {
  const hint = isDemoMode() ? demoStaffCredentials() : null
  return (
    <Suspense fallback={<p className="px-6 py-16">Opening the desk…</p>}>
      <LoginForm hint={hint ? { email: hint.email, password: hint.password } : null} />
    </Suspense>
  )
}
