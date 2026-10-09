import { isDemoMode } from "@/lib/config"
import { MemoryClinicRepository } from "@/lib/domain/memory-store"
import type { ClinicRepository } from "@/lib/domain/repository"
import { parseInput, snapshotSchema } from "@/lib/domain/schemas"
import type { Snapshot } from "@/lib/domain/types"
import { ClinicError, statusFor } from "@/lib/errors"
import { getProcessStore } from "@/lib/server/process-store"

type Action = (store: ClinicRepository, payload: unknown, request: Request) => Promise<unknown>

type DispatchOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  authorize?: (request: Request) => Promise<void>
}

const noStore = { "cache-control": "no-store" }

function errorResponse(error: ClinicError, status = statusFor(error.code)): Response {
  return Response.json({ error: { code: error.code, message: error.message } }, { status, headers: noStore })
}

function actualMethod(request: Request): string {
  if (request.headers.get("x-halcyon-demo") === "1") {
    return request.headers.get("x-halcyon-method") ?? request.method
  }
  return request.method
}

/**
 * Demo requests carry the browser's snapshot and receive the updated snapshot.
 * That keeps a Vercel deployment usable with no database. Production ignores
 * the header and uses Supabase, where the exclusion constraint is the real lock.
 */
export async function dispatch(request: Request, action: Action, options: DispatchOptions = {}): Promise<Response> {
  const demoTransport = request.headers.get("x-halcyon-demo") === "1"
  try {
    if (options.method && actualMethod(request) !== options.method) {
      return errorResponse(new ClinicError("VALIDATION", "That method is not supported."), 405)
    }
    if (demoTransport && !isDemoMode()) {
      throw new ClinicError("FORBIDDEN", "Demo transport is disabled on this deployment.")
    }
    if (options.authorize) await options.authorize(request)

    if (demoTransport) {
      const body = (await request.json()) as { demoState?: unknown; payload?: unknown }
      const snapshot = body.demoState == null ? null : parseInput(snapshotSchema, body.demoState)
      const store = snapshot
        ? MemoryClinicRepository.create(snapshot as Snapshot)
        : MemoryClinicRepository.fromSeed(new Date())
      const data = await action(store, body.payload ?? null, request)
      return Response.json({ data, demoState: store.snapshot() }, { headers: noStore })
    }

    const payload = request.method === "GET" || request.method === "HEAD" ? null : await request.json().catch(() => null)
    const store = isDemoMode() ? getProcessStore() : await loadSupabaseStore()
    const data = await action(store, payload, request)
    return Response.json(data, { headers: noStore })
  } catch (error) {
    if (error instanceof ClinicError) return errorResponse(error)
    if (error instanceof SyntaxError) {
      return errorResponse(new ClinicError("VALIDATION", "The request body was not valid JSON."))
    }
    console.error(error)
    return errorResponse(new ClinicError("VALIDATION", "Something went wrong while saving that change."), 500)
  }
}

async function loadSupabaseStore(): Promise<ClinicRepository> {
  const { SupabaseClinicRepository } = await import("@/lib/supabase/store")
  return new SupabaseClinicRepository()
}
