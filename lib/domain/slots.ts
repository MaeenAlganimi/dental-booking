import type { Slot } from "@/lib/domain/types"
import { eachDate, weekdayOf, zonedDateTime } from "@/lib/domain/time"

export type BusyRange = {
  startsAt: string
  endsAt: string
}

/** Half-open ranges: a visit that ends at 11:00 does not block one that starts at 11:00. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function generateSlots(input: {
  timeZone: string
  from: string
  to: string
  durationMinutes: number
  intervalMinutes: number
  workingHours: { weekday: number; startMinute: number; endMinute: number }[]
  busy: BusyRange[]
  now: Date
  minLeadMinutes: number
}): Slot[] {
  if (input.durationMinutes <= 0 || input.intervalMinutes <= 0) return []

  const earliest = input.now.getTime() + input.minLeadMinutes * 60_000
  const busy = input.busy.map((range) => ({
    start: new Date(range.startsAt).getTime(),
    end: new Date(range.endsAt).getTime(),
  }))
  const slots: Slot[] = []

  for (const date of eachDate(input.from, input.to)) {
    const weekday = weekdayOf(date)
    const windows = input.workingHours.filter((hour) => hour.weekday === weekday)
    for (const window of windows) {
      for (
        let minute = window.startMinute;
        minute + input.durationMinutes <= window.endMinute;
        minute += input.intervalMinutes
      ) {
        const start = zonedDateTime(date, minute, input.timeZone)
        const endMs = start.getTime() + input.durationMinutes * 60_000
        if (start.getTime() < earliest) continue
        const blocked = busy.some((range) => rangesOverlap(start.getTime(), endMs, range.start, range.end))
        if (blocked) continue
        slots.push({
          startsAt: start.toISOString(),
          endsAt: new Date(endMs).toISOString(),
        })
      }
    }
  }

  return slots
}
