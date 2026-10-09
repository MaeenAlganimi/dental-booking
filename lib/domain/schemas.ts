import { z } from "zod"
import { ClinicError } from "@/lib/errors"

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
const instant = z.string().datetime({ offset: true })

export const bookSchema = z.object({
  dentistId: uuid,
  serviceId: uuid,
  startsAt: instant,
  patientName: z.string().trim().min(2, "Enter the patient name.").max(80),
  patientEmail: z.string().trim().email("Enter a valid email.").max(120),
  patientPhone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Enter a phone number."),
  notes: z.string().trim().max(500).optional().default(""),
})

export const rescheduleSchema = z.object({
  startsAt: instant,
})

export const slotQuerySchema = z.object({
  dentistId: uuid,
  serviceId: uuid,
  from: isoDate,
  to: isoDate,
})

export const rangeQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
})

export const statusSchema = z.object({
  status: z.enum(["cancelled", "completed"]),
})

export const dentistSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Enter the dentist's name.").max(80),
  credentials: z.string().trim().min(2).max(40),
  focus: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(10, "Add a short bio.").max(600),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color."),
  active: z.boolean(),
  serviceIds: z.array(uuid).min(1, "Choose at least one service."),
})

export const serviceSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(4).max(240),
  durationMinutes: z.number().int().min(15).max(240),
  priceCents: z.number().int().min(0).max(500_000),
  active: z.boolean(),
})

export const hoursSchema = z
  .object({
    dentistId: uuid,
    hours: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startMinute: z.number().int().min(0).max(24 * 60),
          endMinute: z.number().int().min(0).max(24 * 60),
        }),
      )
      .max(7),
  })
  .superRefine((value, ctx) => {
    const days = new Set<number>()
    for (const hour of value.hours) {
      if (hour.endMinute <= hour.startMinute) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End time must be after the start time." })
      }
      if (days.has(hour.weekday)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only one window per day." })
      }
      days.add(hour.weekday)
    }
  })

export const timeOffSchema = z
  .object({
    dentistId: uuid,
    date: isoDate,
    startMinute: z.number().int().min(0).max(24 * 60),
    endMinute: z.number().int().min(0).max(24 * 60),
    reason: z.string().trim().min(2, "Add a short reason.").max(140),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "A closure must end after it starts.",
  })

export const markSentSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
  channel: z.enum(["in_app", "n8n"]),
})

const clinicSchema = z.object({
  id: uuid,
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80),
  timezone: z.string().min(1).max(80),
  phone: z.string().min(1).max(40),
  email: z.string().min(3).max(120),
  address: z.string().min(1).max(200),
  reminderLeadHours: z.number().int().min(1).max(168),
  slotIntervalMinutes: z.number().int().min(5).max(120),
  minLeadMinutes: z.number().int().min(0).max(24 * 60),
  bookingWindowDays: z.number().int().min(1).max(90),
})

export const snapshotSchema = z.object({
  version: z.literal(1),
  clinic: clinicSchema,
  dentists: z
    .array(
      z.object({
        id: uuid,
        clinicId: uuid,
        name: z.string().max(80),
        credentials: z.string().max(40),
        focus: z.string().max(80),
        bio: z.string().max(600),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        active: z.boolean(),
      }),
    )
    .max(30),
  services: z
    .array(
      z.object({
        id: uuid,
        clinicId: uuid,
        name: z.string().max(80),
        summary: z.string().max(240),
        durationMinutes: z.number().int().min(15).max(240),
        priceCents: z.number().int().min(0).max(500_000),
        active: z.boolean(),
      }),
    )
    .max(40),
  dentistServices: z.array(z.object({ dentistId: uuid, serviceId: uuid })).max(200),
  workingHours: z
    .array(
      z.object({
        id: uuid,
        dentistId: uuid,
        weekday: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1440),
        endMinute: z.number().int().min(0).max(1440),
      }),
    )
    .max(80),
  timeOff: z
    .array(
      z.object({
        id: uuid,
        dentistId: uuid,
        startsAt: instant,
        endsAt: instant,
        reason: z.string().max(140),
      }),
    )
    .max(200),
  appointments: z
    .array(
      z.object({
        id: uuid,
        clinicId: uuid,
        dentistId: uuid,
        serviceId: uuid,
        patientName: z.string().max(80),
        patientEmail: z.string().max(120),
        patientPhone: z.string().max(30),
        notes: z.string().max(500),
        startsAt: instant,
        endsAt: instant,
        status: z.enum(["booked", "cancelled", "completed"]),
        manageToken: z.string().min(8).max(80),
        reminderSentAt: instant.nullable(),
        createdAt: instant,
        updatedAt: instant,
      }),
    )
    .max(400),
  reminderLog: z
    .array(
      z.object({
        id: uuid,
        appointmentId: uuid,
        channel: z.enum(["in_app", "n8n"]),
        subject: z.string().max(200),
        body: z.string().max(4000),
        sentAt: instant,
      }),
    )
    .max(800),
})

export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ClinicError("VALIDATION", result.error.issues[0]?.message ?? "Check the form and try again.")
  }
  return result.data
}
