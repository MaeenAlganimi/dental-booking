import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { DEMO_COOKIE, hashesEqual, signDemoSession } from "@/lib/auth/session"
import { isDemoMode } from "@/lib/config"
import { demoStaffCredentials } from "@/lib/server/secrets"
import { createAdminClient } from "@/lib/supabase/admin"

type LoginBody = { email?: string; password?: string }

function credentials(body: unknown): LoginBody {
  if (!body || typeof body !== "object") return {}
  const record = body as { payload?: LoginBody; email?: string; password?: string }
  if (record.payload && typeof record.payload === "object") return record.payload
  return record
}

export async function POST(request: Request) {
  const body = credentials(await request.json().catch(() => null))
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")

  if (isDemoMode()) {
    const expected = demoStaffCredentials()
    const emailOk = await hashesEqual(email, expected.email.toLowerCase())
    const passwordOk = await hashesEqual(password, expected.password)
    if (!emailOk || !passwordOk) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Those credentials were not recognized." } },
        { status: 401 },
      )
    }
    const token = await signDemoSession({ email: expected.email, name: expected.name })
    const response = NextResponse.json({ email: expected.email, name: expected.name })
    response.cookies.set(DEMO_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
      secure: process.env.NODE_ENV === "production",
    })
    return response
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Supabase auth is not configured." } },
      { status: 500 },
    )
  }

  const jar: { name: string; value: string; options: CookieOptions }[] = []
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return []
      },
      setAll(cookiesToSet) {
        jar.splice(0, jar.length, ...cookiesToSet)
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Those credentials were not recognized." } },
      { status: 401 },
    )
  }
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Those credentials were not recognized." } },
      { status: 401 },
    )
  }
  const admin = createAdminClient()
  const { data: profile } = await admin.from("staff_profiles").select("full_name").eq("user_id", data.user.id).maybeSingle()
  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "This account is not on the clinic desk." } },
      { status: 403 },
    )
  }

  const response = NextResponse.json({ email: data.user.email, name: (profile as { full_name: string }).full_name })
  for (const cookie of jar) response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
