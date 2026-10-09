/** True when the deployment has no Supabase project wired up. */
export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DATA_MODE === "supabase") return false
  if (process.env.NEXT_PUBLIC_DATA_MODE === "demo") return true
  return !process.env.NEXT_PUBLIC_SUPABASE_URL
}

export function appOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, "")
  return new URL(requestUrl).origin
}
