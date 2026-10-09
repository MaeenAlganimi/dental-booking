import { describe, expect, it } from "vitest"
import { dentistIds, serviceIds } from "@/lib/domain/ids"
import { MemoryClinicRepository } from "@/lib/domain/memory-store"
import { buildSeed } from "@/lib/domain/seed"
import { selectDueReminders } from "@/lib/domain/reminders"
import { ClinicError } from "@/lib/errors"

const now = new Date("2026-04-08T15:00:00.000Z")

function store() {
  return MemoryClinicRepository.fromSeed(now, () => now)
}

const patient = {
  patientName: "Ada Lovelace",
  patientEmail: "ada@example.com",
  patientPhone: "503-555-0110",
  notes: "",
}

describe("booking", () => {
  it("rejects a second hold on the same chair and allows it after a cancel", async () => {
    const clinic = store()
    const slots = await clinic.getSlots({
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      from: "2026-04-08",
      to: "2026-04-20",
    })
    const startsAt = slots[0]?.startsAt
    expect(startsAt).toBeTruthy()
    const first = await clinic.book({ ...patient, dentistId: dentistIds.raman, serviceId: serviceIds.cleaning, startsAt: startsAt! })
    await expect(
      clinic.book({ ...patient, patientName: "Grace Hopper", dentistId: dentistIds.raman, serviceId: serviceIds.cleaning, startsAt: startsAt! }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" })
    await clinic.cancelByToken(first.manageToken)
    const second = await clinic.book({
      ...patient,
      patientName: "Grace Hopper",
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      startsAt: startsAt!,
    })
    expect(second.patientName).toBe("Grace Hopper")
  })

  it("serializes two simultaneous bookings so only one survives", async () => {
    const clinic = store()
    const slots = await clinic.getSlots({
      dentistId: dentistIds.shah,
      serviceId: serviceIds.exam,
      from: "2026-04-08",
      to: "2026-04-20",
    })
    const startsAt = slots[0]!.startsAt
    const results = await Promise.allSettled([
      clinic.book({ ...patient, dentistId: dentistIds.shah, serviceId: serviceIds.exam, startsAt }),
      clinic.book({ ...patient, patientEmail: "other@example.com", dentistId: dentistIds.shah, serviceId: serviceIds.exam, startsAt }),
    ])
    const fulfilled = results.filter((result) => result.status === "fulfilled")
    const rejected = results.filter((result) => result.status === "rejected")
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ClinicError)
  })

  it("refuses a service the dentist does not offer", async () => {
    const clinic = store()
    const slots = await clinic.getSlots({
      dentistId: dentistIds.shah,
      serviceId: serviceIds.crown,
      from: "2026-04-13",
      to: "2026-04-17",
    })
    await expect(
      clinic.book({
        ...patient,
        dentistId: dentistIds.voss,
        serviceId: serviceIds.crown,
        startsAt: slots[0]!.startsAt,
      }),
    ).rejects.toMatchObject({ code: "CLOSED" })
  })

  it("blocks a move onto an occupied chair and clears a sent reminder when the time changes", async () => {
    const clinic = store()
    const maya = (await clinic.listAppointments("2026-04-08", "2026-04-10")).find((visit) => visit.patientName === "Maya Chen")
    expect(maya).toBeTruthy()
    const sent = await clinic.runReminderSweep("in_app", now, "http://localhost:3000")
    expect(sent.some((entry) => entry.appointmentId === maya!.id)).toBe(true)
    const slots = await clinic.getSlots({
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      from: "2026-04-08",
      to: "2026-04-15",
    })
    const ada = await clinic.book({
      ...patient,
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      startsAt: slots[0]!.startsAt,
    })
    const moved = await clinic.rescheduleByToken(maya!.manageToken, slots[1]!.startsAt)
    expect(moved.reminderSentAt).toBeNull()
    expect(moved.startsAt).not.toBe(maya!.startsAt)
    await expect(clinic.rescheduleByToken(maya!.manageToken, ada.startsAt)).rejects.toMatchObject({ code: "SLOT_TAKEN" })
  })
})

describe("seed reminders", () => {
  it("includes Maya inside the lead window and leaves later visits alone", () => {
    const snapshot = buildSeed(now)
    const due = selectDueReminders(snapshot.appointments, now, snapshot.clinic.reminderLeadHours)
    expect(due.map((visit) => visit.patientName)).toContain("Maya Chen")
    expect(due.map((visit) => visit.patientName)).not.toContain("Noah Patel")
    expect(due.map((visit) => visit.patientName)).not.toContain("Owen Blake")
  })
})
