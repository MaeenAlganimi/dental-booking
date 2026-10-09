import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  const y = utc.getUTCFullYear()
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0")
  const d = String(utc.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

export function localDate(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd")
}

/** Interpret a clinic-local calendar time as an absolute instant. */
export function zonedDateTime(isoDate: string, minutes: number, timeZone: string): Date {
  return fromZonedTime(`${isoDate}T${minutesToTime(minutes)}:00`, timeZone)
}

export function eachDate(from: string, to: string): string[] {
  if (to < from) return []
  const dates: string[] = []
  let cursor = from
  while (cursor <= to && dates.length <= 366) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number)
  const [y2, m2, d2] = to.split("-").map(Number)
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  return Math.round((end - start) / 86_400_000)
}

/**
 * Next daytime chair time: on the hour, 09:00–16:00 clinic-local,
 * at least 90 minutes ahead, and always inside the next 24 hours.
 */
export function nextDaytimeVisit(now: Date, timeZone: string): Date {
  const start = localDate(now, timeZone)
  for (const offset of [0, 1]) {
    const date = addDays(start, offset)
    for (let minute = 9 * 60; minute <= 16 * 60; minute += 60) {
      const instant = zonedDateTime(date, minute, timeZone)
      const delta = instant.getTime() - now.getTime()
      if (delta >= 90 * 60_000 && delta <= 24 * 60 * 60_000) return instant
    }
  }
  return new Date(now.getTime() + 20 * 60 * 60_000)
}

export function createToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function createId(): string {
  return crypto.randomUUID()
}
