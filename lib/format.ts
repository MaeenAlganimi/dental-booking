import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function formatWhen(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "EEE d MMM · h:mm a")
}

export function formatTime(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "h:mm a")
}

export function formatDayLabel(isoDate: string, timeZone: string): string {
  const instant = fromZonedTime(`${isoDate}T12:00:00`, timeZone)
  return formatInTimeZone(instant, timeZone, "EEE d MMM")
}

export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`
}
