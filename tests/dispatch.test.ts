import { describe, expect, it } from "vitest"
import { dentistIds, serviceIds } from "@/lib/domain/ids"
import { MemoryClinicRepository } from "@/lib/domain/memory-store"
import { dispatch } from "@/lib/server/dispatch"

describe("demo booking transport", () => {
  it("keeps the second request from double-booking the snapshot the first one returned", async () => {
    const seeded = MemoryClinicRepository.fromSeed(new Date(), () => new Date())
    const today = new Date()
    const from = today.toISOString().slice(0, 10)
    const slots = await seeded.getSlots({
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      from,
      to: new Date(today.getTime() + 20 * 24 * 60 * 60_000).toISOString().slice(0, 10),
    })
    const startsAt = slots.find((slot) => new Date(slot.startsAt).getTime() > Date.now() + 2 * 60 * 60_000)?.startsAt
    if (!startsAt) throw new Error("expected an open slot")
    const payload = {
      dentistId: dentistIds.raman,
      serviceId: serviceIds.cleaning,
      startsAt,
      patientName: "Ada Lovelace",
      patientEmail: "ada@example.com",
      patientPhone: "503-555-0110",
      notes: "",
    }

    async function book(demoState: unknown) {
      return dispatch(
        new Request("http://localhost/api/appointments", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-halcyon-demo": "1",
            "x-halcyon-method": "POST",
          },
          body: JSON.stringify({ demoState, payload }),
        }),
        (repo, body) => repo.book(body as typeof payload),
      )
    }

    const first = await book(seeded.snapshot())
    expect(first.status).toBe(200)
    const saved = (await first.json()) as { demoState: unknown }
    const second = await book(saved.demoState)
    expect(second.status).toBe(409)
    const error = (await second.json()) as { error: { code: string } }
    expect(error.error.code).toBe("SLOT_TAKEN")
  })
})
