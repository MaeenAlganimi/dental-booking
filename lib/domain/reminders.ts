import { formatInTimeZone } from "date-fns-tz"
import type { Appointment } from "@/lib/domain/types"

export function selectDueReminders(
  appointments: Appointment[],
  now: Date,
  leadHours: number,
): Appointment[] {
  const horizon = now.getTime() + leadHours * 60 * 60_000
  return appointments
    .filter((appointment) => {
      if (appointment.status !== "booked" || appointment.reminderSentAt) return false
      const start = new Date(appointment.startsAt).getTime()
      return start > now.getTime() && start <= horizon
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function composeReminder(input: {
  patientName: string
  serviceName: string
  dentistName: string
  startsAt: string
  timeZone: string
  clinicName: string
  phone: string
  manageUrl: string
}): { subject: string; body: string } {
  const when = formatInTimeZone(input.startsAt, input.timeZone, "EEE d MMM, h:mm a")
  const subject = `${input.clinicName}: ${input.serviceName} on ${when}`
  const body = [
    `Hello ${input.patientName},`,
    "",
    `This is a reminder from ${input.clinicName}. Your ${input.serviceName.toLowerCase()} with ${input.dentistName} is scheduled for ${when}.`,
    "",
    "Need to move or cancel? Use this link:",
    input.manageUrl,
    "",
    `Call the desk at ${input.phone} if that time no longer works.`,
    "",
    input.clinicName,
  ].join("\n")
  return { subject, body }
}
