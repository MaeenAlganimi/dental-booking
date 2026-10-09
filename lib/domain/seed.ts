import { appointmentIds, clinicId, CLINIC_TIMEZONE, dentistIds, serviceIds } from "@/lib/domain/ids"
import { addDays, createId, localDate, nextDaytimeVisit, zonedDateTime } from "@/lib/domain/time"
import type { Appointment, AppointmentStatus, Service, Snapshot, WorkingHours } from "@/lib/domain/types"

const TZ = CLINIC_TIMEZONE

function window(dentistId: string, weekdays: number[], startMinute: number, endMinute: number): WorkingHours[] {
  return weekdays.map((weekday) => ({
    id: createId(),
    dentistId,
    weekday,
    startMinute,
    endMinute,
  }))
}

function visit(input: {
  id: string
  token: string
  dentistId: string
  serviceId: string
  patientName: string
  patientEmail: string
  patientPhone: string
  start: Date
  durationMinutes: number
  status: AppointmentStatus
  now: Date
}): Appointment {
  return {
    id: input.id,
    clinicId,
    dentistId: input.dentistId,
    serviceId: input.serviceId,
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
    notes: "",
    startsAt: input.start.toISOString(),
    endsAt: new Date(input.start.getTime() + input.durationMinutes * 60_000).toISOString(),
    status: input.status,
    manageToken: input.token,
    reminderSentAt: null,
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
  }
}

const services: Service[] = [
  {
    id: serviceIds.exam,
    clinicId,
    name: "New patient exam",
    summary: "A full look, films if you need them, and a plan before anything is scheduled.",
    durationMinutes: 60,
    priceCents: 9500,
    active: true,
  },
  {
    id: serviceIds.cleaning,
    clinicId,
    name: "Routine cleaning",
    summary: "Polish, a gum check, and a dentist glance if something looks off.",
    durationMinutes: 60,
    priceCents: 14500,
    active: true,
  },
  {
    id: serviceIds.deep,
    clinicId,
    name: "Deep cleaning",
    summary: "For gums that need more than a routine visit. Booked as one longer chair.",
    durationMinutes: 90,
    priceCents: 28000,
    active: true,
  },
  {
    id: serviceIds.whitening,
    clinicId,
    name: "Whitening consult",
    summary: "Whether to whiten, and which way. The treatment itself is booked after.",
    durationMinutes: 30,
    priceCents: 6000,
    active: true,
  },
  {
    id: serviceIds.crown,
    clinicId,
    name: "Crown prep",
    summary: "Numbing, shaping, and a temporary. The seat visit is booked before you leave.",
    durationMinutes: 90,
    priceCents: 42000,
    active: true,
  },
  {
    id: serviceIds.emergency,
    clinicId,
    name: "Emergency visit",
    summary: "Tooth pain, a lost crown, swelling. Call the desk if you cannot wait.",
    durationMinutes: 40,
    priceCents: 18000,
    active: true,
  },
]

/** Sample Whitmore Dental book. Times are relative to `now`, so the demo never goes stale. */
export function buildSeed(now: Date): Snapshot {
  const today = localDate(now, TZ)
  const closureDay = addDays(today, 10)
  const mayaStart = nextDaytimeVisit(now, TZ)

  return {
    version: 1,
    clinic: {
      id: clinicId,
      name: "Whitmore Dental",
      slug: "whitmore",
      timezone: TZ,
      phone: "(503) 555-0148",
      email: "desk@whitmore.dental",
      address: "418 Whitmore Avenue, Portland, OR",
      reminderLeadHours: 24,
      slotIntervalMinutes: 30,
      minLeadMinutes: 60,
      bookingWindowDays: 21,
    },
    dentists: [
      {
        id: dentistIds.shah,
        clinicId,
        name: "Amira Shah",
        credentials: "DDS",
        focus: "Restorative",
        bio: "Crowns, fractures, and the fillings people postpone. Amira keeps the visit short and the explanation plain.",
        color: "#1b4a38",
        active: true,
      },
      {
        id: dentistIds.ellison,
        clinicId,
        name: "Jonah Ellison",
        credentials: "DMD",
        focus: "Implants",
        bio: "Plans the longer cases: missing teeth, cracked molars, and visits that need more than one appointment.",
        color: "#9a6b32",
        active: true,
      },
      {
        id: dentistIds.raman,
        clinicId,
        name: "Priya Raman",
        credentials: "DDS",
        focus: "Prevention",
        bio: "Cleanings, exams, and the six-month rhythm. Priya is who most of the book is built around.",
        color: "#3d5a80",
        active: true,
      },
      {
        id: dentistIds.voss,
        clinicId,
        name: "Elena Voss",
        credentials: "DDS",
        focus: "Children",
        bio: "Sees kids through Saturday. First visits are paced slowly, and parents stay in the room.",
        color: "#8d3d32",
        active: true,
      },
    ],
    services,
    dentistServices: [
      { dentistId: dentistIds.shah, serviceId: serviceIds.exam },
      { dentistId: dentistIds.shah, serviceId: serviceIds.cleaning },
      { dentistId: dentistIds.shah, serviceId: serviceIds.crown },
      { dentistId: dentistIds.shah, serviceId: serviceIds.whitening },
      { dentistId: dentistIds.ellison, serviceId: serviceIds.exam },
      { dentistId: dentistIds.ellison, serviceId: serviceIds.crown },
      { dentistId: dentistIds.ellison, serviceId: serviceIds.emergency },
      { dentistId: dentistIds.raman, serviceId: serviceIds.exam },
      { dentistId: dentistIds.raman, serviceId: serviceIds.cleaning },
      { dentistId: dentistIds.raman, serviceId: serviceIds.deep },
      { dentistId: dentistIds.raman, serviceId: serviceIds.whitening },
      { dentistId: dentistIds.voss, serviceId: serviceIds.exam },
      { dentistId: dentistIds.voss, serviceId: serviceIds.cleaning },
      { dentistId: dentistIds.voss, serviceId: serviceIds.emergency },
    ],
    workingHours: [
      ...window(dentistIds.shah, [1, 2, 3, 4], 8 * 60, 16 * 60),
      ...window(dentistIds.ellison, [2, 3, 4, 5], 9 * 60, 17 * 60),
      ...window(dentistIds.raman, [1, 2, 3, 4, 5], 8 * 60, 15 * 60),
      ...window(dentistIds.voss, [3, 4, 5, 6], 9 * 60, 14 * 60),
    ],
    timeOff: [
      {
        id: "66666666-6666-4666-8666-666666666601",
        dentistId: dentistIds.ellison,
        startsAt: zonedDateTime(closureDay, 13 * 60, TZ).toISOString(),
        endsAt: zonedDateTime(closureDay, 17 * 60, TZ).toISOString(),
        reason: "Study club",
      },
    ],
    appointments: [
      visit({
        id: appointmentIds.maya,
        token: "seed-maya-chen",
        dentistId: dentistIds.raman,
        serviceId: serviceIds.cleaning,
        patientName: "Maya Chen",
        patientEmail: "maya.chen@example.com",
        patientPhone: "503-555-0198",
        start: mayaStart,
        durationMinutes: 60,
        status: "booked",
        now,
      }),
      visit({
        id: appointmentIds.noah,
        token: "seed-noah-patel",
        dentistId: dentistIds.shah,
        serviceId: serviceIds.crown,
        patientName: "Noah Patel",
        patientEmail: "noah.patel@example.com",
        patientPhone: "503-555-0172",
        start: zonedDateTime(addDays(today, 5), 10 * 60, TZ),
        durationMinutes: 90,
        status: "booked",
        now,
      }),
      visit({
        id: appointmentIds.lila,
        token: "seed-lila-brooks",
        dentistId: dentistIds.voss,
        serviceId: serviceIds.exam,
        patientName: "Lila Brooks",
        patientEmail: "lila.brooks@example.com",
        patientPhone: "503-555-0164",
        start: zonedDateTime(addDays(today, 2), 9 * 60, TZ),
        durationMinutes: 60,
        status: "booked",
        now,
      }),
      visit({
        id: appointmentIds.owen,
        token: "seed-owen-blake",
        dentistId: dentistIds.raman,
        serviceId: serviceIds.cleaning,
        patientName: "Owen Blake",
        patientEmail: "owen.blake@example.com",
        patientPhone: "503-555-0133",
        start: zonedDateTime(addDays(today, -1), 10 * 60, TZ),
        durationMinutes: 60,
        status: "completed",
        now,
      }),
    ],
    reminderLog: [],
  }
}
