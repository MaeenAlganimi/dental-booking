import { NextResponse } from "next/server"
import { DEMO_COOKIE } from "@/lib/auth/session"
import { isDemoMode } from "@/lib/config"
import { createAuthClient } from "@/lib/supabase/server"

export async function POST() {
  if (!isDemoMode()) {
    const supabase = await createAuthClient()
    await supabase.auth.signOut()
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEMO_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return response
}
