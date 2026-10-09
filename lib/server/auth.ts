import "server-only"
import { DEMO_COOKIE, readCookie, readDemoSession } from "@/lib/auth/session"
import { isDemoMode } from "@/lib/config"
import { ClinicError } from "@/lib/errors"
import { cronSecret } from "@/lib/server/secrets"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAuthClient } from "@/lib/supabase/server"

export async function staffFromRequest(request: Request): Promise<{ email: string; name: string } | null> {
  if (isDemoMode()) {
    return readDemoSession(readCookie(request, DEMO_COOKIE))
  }
  const supabase = await createAuthClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user?.email) return null
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from("staff_profiles")
    .select("full_name")
    .eq("user_id", data.user.id)
    .maybeSingle()
  if (error) {
    console.error(error)
    return null
  }
  if (!profile) return null
  return { email: data.user.email, name: (profile as { full_name: string }).full_name }
}

export async function requireStaff(request: Request): Promise<void> {
  const staff = await staffFromRequest(request)
  if (!staff) throw new ClinicError("UNAUTHENTICATED", "Sign in to the desk to continue.")
}

export async function authorizeReminder(request: Request): Promise<void> {
  const secret = cronSecret()
  const header = request.headers.get("authorization")
  if (secret && header === `Bearer ${secret}`) return
  if (await staffFromRequest(request)) return
  throw new ClinicError("UNAUTHENTICATED", "A cron secret or desk session is required.")
}
