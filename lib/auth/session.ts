export const DEMO_COOKIE = "halcyon_demo"

type DemoSession = {
  email: string
  name: string
  exp: number
}

function secret(): string {
  return process.env.DEMO_SESSION_SECRET || "halcyon-demo-only-not-for-production"
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let index = 0; index < a.length; index += 1) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return mismatch === 0
}

export async function hashesEqual(left: string, right: string): Promise<boolean> {
  const digest = async (value: string) => {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    return bytesToBase64Url(new Uint8Array(hash))
  }
  const [a, b] = await Promise.all([digest(left), digest(right)])
  return safeEqual(a, b)
}

export async function signDemoSession(input: { email: string; name: string }): Promise<string> {
  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ email: input.email, name: input.name, exp: Date.now() + 12 * 60 * 60_000 })),
  )
  return `${body}.${await hmac(body)}`
}

export async function readDemoSession(token: string | undefined): Promise<{ email: string; name: string } | null> {
  if (!token) return null
  const [body, signature] = token.split(".")
  if (!body || !signature) return null
  const expected = await hmac(body)
  if (!safeEqual(signature, expected)) return null
  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as DemoSession
    if (!json.exp || json.exp < Date.now()) return null
    if (!json.email || !json.name) return null
    return { email: json.email, name: json.name }
  } catch {
    return null
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie")
  if (!header) return undefined
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return undefined
}
