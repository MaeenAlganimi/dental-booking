import { ClinicError } from "@/lib/errors"
import { generateSlots, type BusyRange } from "@/lib/domain/slots"
import { localDate } from "@/lib/domain/time"
import type { Clinic, Dentist, Service, WorkingHours } from "@/lib/domain/types"

export function assertBookable(input: {
  clinic: Clinic
  dentist: Dentist
  service: Service
  offers: boolean
  workingHours: WorkingHours[]
  busy: BusyRange[]
  startsAt: string
  now: Date
}): { startsAt: string; endsAt: string } {
  if (input.dentist.clinicId !== input.clinic.id || input.service.clinicId !== input.clinic.id) {
    throw new ClinicError("VALIDATION", "That choice does not belong to this clinic.")
  }
  if (!input.dentist.active || !input.service.active || !input.offers) {
    throw new ClinicError("CLOSED", "That dentist is not seeing patients for this service.")
  }

  const date = localDate(new Date(input.startsAt), input.clinic.timezone)
  const slots = generateSlots({
    timeZone: input.clinic.timezone,
    from: date,
    to: date,
    durationMinutes: input.service.durationMinutes,
    intervalMinutes: input.clinic.slotIntervalMinutes,
    workingHours: input.workingHours.filter((hour) => hour.dentistId === input.dentist.id),
    busy: input.busy,
    now: input.now,
    minLeadMinutes: input.clinic.minLeadMinutes,
  })
  const canonical = new Date(input.startsAt).toISOString()
  const match = slots.find((slot) => slot.startsAt === canonical)
  if (!match) {
    throw new ClinicError("SLOT_TAKEN", "That time is no longer open.")
  }
  return match
}
