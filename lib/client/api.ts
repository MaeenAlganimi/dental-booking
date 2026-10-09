import { isDemoMode } from "@/lib/config"
import { ClinicError, type ClinicErrorCode } from "@/lib/errors"

const STORAGE_KEY = "halcyon.demo.v1"

let queue: Promise<unknown> = Promise.resolve()

export function resetDemoState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function loadDemoState(): unknown {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function saveDemoState(state: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function request<T>(path: string, init?: { method?: string; body?: unknown; auth?: boolean }): Promise<T> {
  const method = init?.method ?? "GET"
  const demo = isDemoMode() && !init?.auth
  const headers = new Headers({ accept: "application/json" })
  let body: string | undefined

  if (demo) {
    headers.set("content-type", "application/json")
    headers.set("x-halcyon-demo", "1")
    headers.set("x-halcyon-method", method)
    body = JSON.stringify({ demoState: loadDemoState(), payload: init?.body ?? null })
  } else if (init?.body !== undefined) {
    headers.set("content-type", "application/json")
    body = JSON.stringify(init.body)
  }

  const response = await fetch(path, {
    method: demo ? "POST" : method,
    headers,
    body,
  })
  const text = await response.text()
  const json = text ? (JSON.parse(text) as { data?: T; demoState?: unknown; error?: { code?: ClinicErrorCode; message?: string } }) : null

  if (demo && json && "demoState" in json && json.demoState) saveDemoState(json.demoState)
  if (!response.ok) {
    throw new ClinicError(json?.error?.code ?? "VALIDATION", json?.error?.message ?? "Request failed.")
  }
  if (demo) return json?.data as T
  return json as T
}

export function api<T>(path: string, init?: { method?: string; body?: unknown; auth?: boolean }): Promise<T> {
  if (!isDemoMode() || init?.auth) return request<T>(path, init)
  const run = queue.then(() => request<T>(path, init))
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
