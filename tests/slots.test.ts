import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { describe, expect, it } from "vitest"
import { generateSlots, rangesOverlap } from "@/lib/domain/slots"
import { nextDaytimeVisit } from "@/lib/domain/time"

describe("rangesOverlap", () => {
  it("treats ranges as half-open", () => {
    expect(rangesOverlap(0, 60, 60, 120)).toBe(false)
    expect(rangesOverlap(0, 61, 60, 120)).toBe(true)
    expect(rangesOverlap(30, 90, 0, 60)).toBe(true)
  })
})

describe("generateSlots", () => {
  const hours = [{ weekday: 4, startMinute: 9 * 60, endMinute: 12 * 60 }]

  it("places a winter morning on the clinic clock", () => {
    const slots = generateSlots({
      timeZone: "America/Los_Angeles",
      from: "2026-01-15",
      to: "2026-01-15",
      durationMinutes: 60,
      intervalMinutes: 30,
      workingHours: hours,
      busy: [],
      now: new Date("2026-01-14T00:00:00.000Z"),
      minLeadMinutes: 0,
    })
    expect(slots[0]?.startsAt).toBe("2026-01-15T17:00:00.000Z")
    expect(slots.map((slot) => slot.startsAt)).toHaveLength(5)
    expect(slots.at(-1)?.startsAt).toBe("2026-01-15T19:00:00.000Z")
  })

  it("places a summer morning an hour earlier in UTC", () => {
    const slots = generateSlots({
      timeZone: "America/Los_Angeles",
      from: "2026-07-16",
      to: "2026-07-16",
      durationMinutes: 60,
      intervalMinutes: 30,
      workingHours: hours,
      busy: [],
      now: new Date("2026-07-15T00:00:00.000Z"),
      minLeadMinutes: 0,
    })
    expect(slots[0]?.startsAt).toBe("2026-07-16T16:00:00.000Z")
  })

  it("drops partial overlaps and keeps the chair that starts when another ends", () => {
    const slots = generateSlots({
      timeZone: "America/Los_Angeles",
      from: "2026-01-15",
      to: "2026-01-15",
      durationMinutes: 60,
      intervalMinutes: 30,
      workingHours: hours,
      busy: [{ startsAt: "2026-01-15T18:00:00.000Z", endsAt: "2026-01-15T19:00:00.000Z" }],
      now: new Date("2026-01-14T00:00:00.000Z"),
      minLeadMinutes: 0,
    })
    const starts = slots.map((slot) => slot.startsAt)
    expect(starts).toContain("2026-01-15T17:00:00.000Z")
    expect(starts).not.toContain("2026-01-15T17:30:00.000Z")
    expect(starts).not.toContain("2026-01-15T18:00:00.000Z")
    expect(starts).not.toContain("2026-01-15T18:30:00.000Z")
    expect(starts).toContain("2026-01-15T19:00:00.000Z")
  })

  it("hides a closure and times inside the lead window", () => {
    const slots = generateSlots({
      timeZone: "America/Los_Angeles",
      from: "2026-01-15",
      to: "2026-01-15",
      durationMinutes: 60,
      intervalMinutes: 30,
      workingHours: hours,
      busy: [{ startsAt: "2026-01-15T19:30:00.000Z", endsAt: "2026-01-15T20:30:00.000Z" }],
      now: new Date("2026-01-15T17:30:00.000Z"),
      minLeadMinutes: 60,
    })
    expect(slots.map((slot) => slot.startsAt)).toEqual(["2026-01-15T18:30:00.000Z"])
  })

  it("skips a weekday the dentist does not work", () => {
    const slots = generateSlots({
      timeZone: "America/Los_Angeles",
      from: "2026-01-16",
      to: "2026-01-16",
      durationMinutes: 60,
      intervalMinutes: 30,
      workingHours: hours,
      busy: [],
      now: new Date("2026-01-14T00:00:00.000Z"),
      minLeadMinutes: 0,
    })
    expect(slots).toEqual([])
  })
})

describe("nextDaytimeVisit", () => {
  it("stays inside the next day and on a daytime hour", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const now = fromZonedTime(`2026-06-16T${String(hour).padStart(2, "0")}:15:00`, "America/Los_Angeles")
      const next = nextDaytimeVisit(now, "America/Los_Angeles")
      const delta = next.getTime() - now.getTime()
      expect(delta).toBeGreaterThanOrEqual(90 * 60_000)
      expect(delta).toBeLessThanOrEqual(24 * 60 * 60_000)
      const localHour = Number(formatInTimeZone(next, "America/Los_Angeles", "H"))
      expect(localHour).toBeGreaterThanOrEqual(9)
      expect(localHour).toBeLessThanOrEqual(16)
    }
  })
})
