import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { DEMO_COOKIE, readDemoSession } from "@/lib/auth/session"
import { isDemoMode } from "@/lib/config"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname !== "/dashboard" && !pathname.startsWith("/dashboard/")) {
    return NextResponse.next()
  }

  if (isDemoMode()) {
    const session = await readDemoSession(request.cookies.get(DEMO_COOKIE)?.value)
    if (!session) return redirectToLogin(request)
    return NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return redirectToLogin(request)

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  if (!data.user) return redirectToLogin(request)
  return response
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
}
