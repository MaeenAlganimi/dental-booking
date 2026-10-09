import { staffFromRequest } from "@/lib/server/auth"
import { isDemoMode } from "@/lib/config"

async function readSession(request: Request) {
  const staff = await staffFromRequest(request)
  return Response.json({ staff, demo: isDemoMode() }, { headers: { "cache-control": "no-store" } })
}

export function GET(request: Request) {
  return readSession(request)
}

export function POST(request: Request) {
  return readSession(request)
}
