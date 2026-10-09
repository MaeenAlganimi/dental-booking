import { describe, expect, it } from "vitest"
import { composeReminder } from "@/lib/domain/reminders"
import { MemoryClinicRepository } from "@/lib/domain/memory-store"

describe("composeReminder", () => {
  it("includes the manage link and the clinic phone", () => {
    const message = composeReminder({
      patientName: "Maya Chen",
      serviceName: "Routine cleaning",
      dentistName: "Priya Raman",
      startsAt: "2026-04-08T17:00:00.000Z",
      timeZone: "America/Los_Angeles",
      clinicName: "Whitmore Dental",
      phone: "(503) 555-0148",
      manageUrl: "http://localhost:3000/visit/seed-maya-chen",
    })
    expect(message.subject).toContain("Routine cleaning")
    expect(message.body).toContain("http://localhost:3000/visit/seed-maya-chen")
    expect(message.body).toContain("(503) 555-0148")
    expect(message.body).toContain("Hello Maya Chen")
  })
})

describe("reminder sweep", () => {
  it("records a message once", async () => {
    const now = new Date("2026-04-08T15:00:00.000Z")
    const clinic = MemoryClinicRepository.fromSeed(now, () => now)
    const first = await clinic.runReminderSweep("in_app", now, "http://localhost:3000")
    const second = await clinic.runReminderSweep("in_app", now, "http://localhost:3000")
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
    const log = await clinic.listReminderLog()
    expect(log[0]?.body).toContain("/visit/")
  })
})
