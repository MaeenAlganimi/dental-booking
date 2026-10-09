import "server-only"
import { assertBookable } from "@/lib/domain/booking"
import { composeReminder, selectDueReminders } from "@/lib/domain/reminders"
import type {
  BookInput,
  ClinicRepository,
  DentistInput,
  HoursInput,
  ServiceInput,
  SlotQuery,
  TimeOffInput,
} from "@/lib/domain/repository"
import { generateSlots, type BusyRange } from "@/lib/domain/slots"
import { addDays, createId, createToken, daysBetween, localDate, zonedDateTime } from "@/lib/domain/time"
import type {
  Appointment,
  AppointmentStatus,
  AppointmentView,
  Catalog,
  Clinic,
  Dentist,
  DentistService,
  Directory,
  ReminderChannel,
  ReminderDraft,
  ReminderLog,
  Service,
  Slot,
  TimeOff,
  WorkingHours,
} from "@/lib/domain/types"
import { ClinicError } from "@/lib/errors"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

type ClinicRow = {
  id: string
  name: string
  slug: string
  timezone: string
  phone: string
  email: string
  address: string
  reminder_lead_hours: number
  slot_interval_minutes: number
  min_lead_minutes: number
  booking_window_days: number
}

type DentistRow = {
  id: string
  clinic_id: string
  name: string
  credentials: string
  focus: string
  bio: string
  color: string
  active: boolean
}

type ServiceRow = {
  id: string
  clinic_id: string
  name: string
  summary: string
  duration_minutes: number
  price_cents: number
  active: boolean
}

type AppointmentRow = {
  id: string
  clinic_id: string
  dentist_id: string
  service_id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  notes: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  manage_token: string
  reminder_sent_at: string | null
  created_at: string
  updated_at: string
}

type Refs = {
  clinic: Clinic
  dentists: Dentist[]
  services: Service[]
  links: DentistService[]
}

function fail(error: { code?: string; message: string }): never {
  if (error.code === "23P01") {
    throw new ClinicError("SLOT_TAKEN", "That time is no longer open.")
  }
  console.error(error)
  throw new ClinicError("VALIDATION", "The book could not be saved.")
}

function toClinic(row: ClinicRow): Clinic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    phone: row.phone,
    email: row.email,
    address: row.address,
    reminderLeadHours: row.reminder_lead_hours,
    slotIntervalMinutes: row.slot_interval_minutes,
    minLeadMinutes: row.min_lead_minutes,
    bookingWindowDays: row.booking_window_days,
  }
}

function toDentist(row: DentistRow): Dentist {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    credentials: row.credentials,
    focus: row.focus,
    bio: row.bio,
    color: row.color,
    active: row.active,
  }
}

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    summary: row.summary,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    active: row.active,
  }
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    dentistId: row.dentist_id,
    serviceId: row.service_id,
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    manageToken: row.manage_token,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseClinicRepository implements ClinicRepository {
  private client: SupabaseClient

  constructor(client: SupabaseClient = createAdminClient()) {
    this.client = client
  }

  async getCatalog(): Promise<Catalog> {
    const refs = await this.refs()
    const dentists = refs.dentists.filter((dentist) => dentist.active)
    const services = refs.services.filter((service) => service.active)
    return {
      clinic: refs.clinic,
      dentists,
      services,
      dentistServices: refs.links.filter(
        (link) => dentists.some((dentist) => dentist.id === link.dentistId) && services.some((service) => service.id === link.serviceId),
      ),
    }
  }

  async getDirectory(): Promise<Directory> {
    const refs = await this.refs()
    const [{ data: hours, error: hoursError }, { data: closures, error: closureError }] = await Promise.all([
      this.client.from("working_hours").select("*"),
      this.client.from("time_off").select("*").order("starts_at"),
    ])
    if (hoursError) fail(hoursError)
    if (closureError) fail(closureError)
    return {
      dentists: refs.dentists,
      services: refs.services,
      dentistServices: refs.links,
      workingHours: ((hours ?? []) as WorkingHourRow[]).map(toHours),
      timeOff: ((closures ?? []) as TimeOffRow[]).map(toTimeOff),
    }
  }

  async getSlots(query: SlotQuery): Promise<Slot[]> {
    this.assertRange(query.from, query.to)
    const refs = await this.refs()
    const dentist = refs.dentists.find((item) => item.id === query.dentistId)
    const service = refs.services.find((item) => item.id === query.serviceId)
    const offers = refs.links.some((link) => link.dentistId === query.dentistId && link.serviceId === query.serviceId)
    if (!dentist?.active || !service?.active || !offers) return []
    const hours = await this.hoursFor(dentist.id)
    const busy = await this.busyFor(dentist.id, refs.clinic, query.from, query.to)
    return generateSlots({
      timeZone: refs.clinic.timezone,
      from: query.from,
      to: query.to,
      durationMinutes: service.durationMinutes,
      intervalMinutes: refs.clinic.slotIntervalMinutes,
      workingHours: hours,
      busy,
      now: new Date(),
      minLeadMinutes: refs.clinic.minLeadMinutes,
    })
  }

  async book(input: BookInput): Promise<AppointmentView> {
    const refs = await this.refs()
    const dentist = this.requireDentist(refs, input.dentistId)
    const service = this.requireService(refs, input.serviceId)
    const hours = await this.hoursFor(dentist.id)
    const day = localDate(new Date(input.startsAt), refs.clinic.timezone)
    const busy = await this.busyFor(dentist.id, refs.clinic, day, day)
    const slot = assertBookable({
      clinic: refs.clinic,
      dentist,
      service,
      offers: refs.links.some((link) => link.dentistId === dentist.id && link.serviceId === service.id),
      workingHours: hours,
      busy,
      startsAt: input.startsAt,
      now: new Date(),
    })
    const row = {
      id: createId(),
      clinic_id: refs.clinic.id,
      dentist_id: dentist.id,
      service_id: service.id,
      patient_name: input.patientName,
      patient_email: input.patientEmail,
      patient_phone: input.patientPhone,
      notes: input.notes ?? "",
      starts_at: slot.startsAt,
      ends_at: slot.endsAt,
      status: "booked",
      manage_token: createToken(),
    }
    const { data, error } = await this.client.from("appointments").insert(row).select("*").single()
    if (error) fail(error)
    return this.view(toAppointment(data as AppointmentRow), refs)
  }

  async getByToken(token: string): Promise<AppointmentView | null> {
    const { data, error } = await this.client.from("appointments").select("*").eq("manage_token", token).maybeSingle()
    if (error) fail(error)
    if (!data) return null
    return this.view(toAppointment(data as AppointmentRow), await this.refs())
  }

  async cancelByToken(token: string): Promise<AppointmentView> {
    const current = await this.getByToken(token)
    if (!current) throw new ClinicError("NOT_FOUND", "We could not find that visit. The link may be out of date.")
    if (current.status !== "booked") throw new ClinicError("VALIDATION", "Only an upcoming visit can be changed.")
    const { data, error } = await this.client
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", current.id)
      .eq("status", "booked")
      .select("*")
      .maybeSingle()
    if (error) fail(error)
    if (!data) throw new ClinicError("NOT_FOUND", "That visit is not on the book.")
    return this.view(toAppointment(data as AppointmentRow), await this.refs())
  }

  async rescheduleByToken(token: string, startsAt: string): Promise<AppointmentView> {
    const current = await this.getByToken(token)
    if (!current) throw new ClinicError("NOT_FOUND", "We could not find that visit. The link may be out of date.")
    if (current.status !== "booked") throw new ClinicError("VALIDATION", "Only an upcoming visit can be changed.")
    const refs = await this.refs()
    const dentist = this.requireDentist(refs, current.dentistId)
    const service = this.requireService(refs, current.serviceId)
    const hours = await this.hoursFor(dentist.id)
    const day = localDate(new Date(startsAt), refs.clinic.timezone)
    const busy = await this.busyFor(dentist.id, refs.clinic, day, day, current.id)
    const slot = assertBookable({
      clinic: refs.clinic,
      dentist,
      service,
      offers: true,
      workingHours: hours,
      busy,
      startsAt,
      now: new Date(),
    })
    const { data, error } = await this.client
      .from("appointments")
      .update({ starts_at: slot.startsAt, ends_at: slot.endsAt, reminder_sent_at: null })
      .eq("id", current.id)
      .eq("status", "booked")
      .select("*")
      .maybeSingle()
    if (error) fail(error)
    if (!data) throw new ClinicError("NOT_FOUND", "That visit is not on the book.")
    return this.view(toAppointment(data as AppointmentRow), refs)
  }

  async listAppointments(from: string, to: string): Promise<AppointmentView[]> {
    this.assertRange(from, to)
    const refs = await this.refs()
    const start = zonedDateTime(from, 0, refs.clinic.timezone).toISOString()
    const end = zonedDateTime(addDays(to, 1), 0, refs.clinic.timezone).toISOString()
    const { data, error } = await this.client
      .from("appointments")
      .select("*")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at")
    if (error) fail(error)
    return ((data ?? []) as AppointmentRow[]).map((row) => this.view(toAppointment(row), refs))
  }

  async setAppointmentStatus(id: string, status: Exclude<AppointmentStatus, "booked">): Promise<AppointmentView> {
    const { data, error } = await this.client
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .eq("status", "booked")
      .select("*")
      .maybeSingle()
    if (error) fail(error)
    if (!data) throw new ClinicError("NOT_FOUND", "That visit is not on the book.")
    return this.view(toAppointment(data as AppointmentRow), await this.refs())
  }

  async upsertDentist(input: DentistInput): Promise<Dentist> {
    const refs = await this.refs()
    const id = input.id ?? createId()
    const row = {
      id,
      clinic_id: refs.clinic.id,
      name: input.name,
      credentials: input.credentials,
      focus: input.focus,
      bio: input.bio,
      color: input.color,
      active: input.active,
    }
    const { data, error } = await this.client.from("dentists").upsert(row).select("*").single()
    if (error) fail(error)
    for (const serviceId of input.serviceIds) this.requireService(refs, serviceId)
    const { error: deleteError } = await this.client.from("dentist_services").delete().eq("dentist_id", id)
    if (deleteError) fail(deleteError)
    if (input.serviceIds.length) {
      const { error: linkError } = await this.client
        .from("dentist_services")
        .insert(input.serviceIds.map((serviceId) => ({ dentist_id: id, service_id: serviceId })))
      if (linkError) fail(linkError)
    }
    return toDentist(data as DentistRow)
  }

  async upsertService(input: ServiceInput): Promise<Service> {
    const refs = await this.refs()
    const row = {
      id: input.id ?? createId(),
      clinic_id: refs.clinic.id,
      name: input.name,
      summary: input.summary,
      duration_minutes: input.durationMinutes,
      price_cents: input.priceCents,
      active: input.active,
    }
    const { data, error } = await this.client.from("services").upsert(row).select("*").single()
    if (error) fail(error)
    return toService(data as ServiceRow)
  }

  async replaceWorkingHours(input: HoursInput): Promise<WorkingHours[]> {
    const refs = await this.refs()
    this.requireDentist(refs, input.dentistId)
    const { error: deleteError } = await this.client.from("working_hours").delete().eq("dentist_id", input.dentistId)
    if (deleteError) fail(deleteError)
    const rows = input.hours.map((hour) => ({
      id: createId(),
      dentist_id: input.dentistId,
      weekday: hour.weekday,
      start_minute: hour.startMinute,
      end_minute: hour.endMinute,
    }))
    if (!rows.length) return []
    const { data, error } = await this.client.from("working_hours").insert(rows).select("*")
    if (error) fail(error)
    return ((data ?? []) as WorkingHourRow[]).map(toHours)
  }

  async addTimeOff(input: TimeOffInput): Promise<TimeOff> {
    const refs = await this.refs()
    this.requireDentist(refs, input.dentistId)
    const row = {
      id: createId(),
      dentist_id: input.dentistId,
      starts_at: zonedDateTime(input.date, input.startMinute, refs.clinic.timezone).toISOString(),
      ends_at: zonedDateTime(input.date, input.endMinute, refs.clinic.timezone).toISOString(),
      reason: input.reason,
    }
    const { data, error } = await this.client.from("time_off").insert(row).select("*").single()
    if (error) fail(error)
    return toTimeOff(data as TimeOffRow)
  }

  async removeTimeOff(id: string): Promise<void> {
    const { data, error } = await this.client.from("time_off").delete().eq("id", id).select("id")
    if (error) fail(error)
    if (!data?.length) throw new ClinicError("NOT_FOUND", "That closure is not on the book.")
  }

  async listDueReminders(now: Date, origin: string): Promise<ReminderDraft[]> {
    const refs = await this.refs()
    const horizon = new Date(now.getTime() + refs.clinic.reminderLeadHours * 60 * 60_000).toISOString()
    const { data, error } = await this.client
      .from("appointments")
      .select("*")
      .eq("status", "booked")
      .is("reminder_sent_at", null)
      .gt("starts_at", now.toISOString())
      .lte("starts_at", horizon)
    if (error) fail(error)
    const due = selectDueReminders(((data ?? []) as AppointmentRow[]).map(toAppointment), now, refs.clinic.reminderLeadHours)
    return due.map((appointment) => this.draft(appointment, refs, origin))
  }

  async markRemindersSent(ids: string[], channel: ReminderChannel, now: Date, origin: string): Promise<ReminderLog[]> {
    const refs = await this.refs()
    const sent: ReminderLog[] = []
    for (const id of ids) {
      const { data: existing, error: readError } = await this.client.from("appointments").select("*").eq("id", id).maybeSingle()
      if (readError) fail(readError)
      if (!existing) continue
      const appointment = toAppointment(existing as AppointmentRow)
      if (appointment.status !== "booked" || appointment.reminderSentAt) continue
      const draft = this.draft(appointment, refs, origin)
      const { data: updated, error } = await this.client
        .from("appointments")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", id)
        .is("reminder_sent_at", null)
        .select("id")
        .maybeSingle()
      if (error) fail(error)
      if (!updated) continue
      const entry: ReminderLog = {
        id: createId(),
        appointmentId: id,
        channel,
        subject: draft.subject,
        body: draft.body,
        sentAt: now.toISOString(),
      }
      const { error: logError } = await this.client.from("reminder_log").insert({
        id: entry.id,
        appointment_id: entry.appointmentId,
        channel: entry.channel,
        subject: entry.subject,
        body: entry.body,
        sent_at: entry.sentAt,
      })
      if (logError) fail(logError)
      sent.push(entry)
    }
    return sent
  }

  async runReminderSweep(channel: ReminderChannel, now: Date, origin: string): Promise<ReminderLog[]> {
    const due = await this.listDueReminders(now, origin)
    return this.markRemindersSent(
      due.map((item) => item.id),
      channel,
      now,
      origin,
    )
  }

  async listReminderLog(): Promise<ReminderLog[]> {
    const { data, error } = await this.client.from("reminder_log").select("*").order("sent_at", { ascending: false })
    if (error) fail(error)
    return ((data ?? []) as ReminderRow[]).map((row) => ({
      id: row.id,
      appointmentId: row.appointment_id,
      channel: row.channel,
      subject: row.subject,
      body: row.body,
      sentAt: row.sent_at,
    }))
  }

  private async refs(): Promise<Refs> {
    const { data: clinicRow, error: clinicError } = await this.client.from("clinics").select("*").limit(1).maybeSingle()
    if (clinicError) fail(clinicError)
    if (!clinicRow) throw new ClinicError("VALIDATION", "The clinic has not been seeded.")
    const clinic = toClinic(clinicRow as ClinicRow)
    const [{ data: dentists, error: dentistError }, { data: services, error: serviceError }, { data: links, error: linkError }] =
      await Promise.all([
        this.client.from("dentists").select("*").eq("clinic_id", clinic.id).order("name"),
        this.client.from("services").select("*").eq("clinic_id", clinic.id).order("name"),
        this.client.from("dentist_services").select("dentist_id, service_id"),
      ])
    if (dentistError) fail(dentistError)
    if (serviceError) fail(serviceError)
    if (linkError) fail(linkError)
    return {
      clinic,
      dentists: ((dentists ?? []) as DentistRow[]).map(toDentist),
      services: ((services ?? []) as ServiceRow[]).map(toService),
      links: ((links ?? []) as { dentist_id: string; service_id: string }[]).map((link) => ({
        dentistId: link.dentist_id,
        serviceId: link.service_id,
      })),
    }
  }

  private async hoursFor(dentistId: string): Promise<WorkingHours[]> {
    const { data, error } = await this.client.from("working_hours").select("*").eq("dentist_id", dentistId)
    if (error) fail(error)
    return ((data ?? []) as WorkingHourRow[]).map(toHours)
  }

  private async busyFor(
    dentistId: string,
    clinic: Clinic,
    from: string,
    to: string,
    ignoreAppointmentId?: string,
  ): Promise<BusyRange[]> {
    const start = zonedDateTime(from, 0, clinic.timezone).toISOString()
    const end = zonedDateTime(addDays(to, 1), 0, clinic.timezone).toISOString()
    const [{ data: appointments, error: appointmentError }, { data: closures, error: closureError }] = await Promise.all([
      this.client
        .from("appointments")
        .select("id, starts_at, ends_at")
        .eq("dentist_id", dentistId)
        .eq("status", "booked")
        .lt("starts_at", end)
        .gt("ends_at", start),
      this.client.from("time_off").select("starts_at, ends_at").eq("dentist_id", dentistId).lt("starts_at", end).gt("ends_at", start),
    ])
    if (appointmentError) fail(appointmentError)
    if (closureError) fail(closureError)
    const visits = ((appointments ?? []) as { id: string; starts_at: string; ends_at: string }[])
      .filter((row) => row.id !== ignoreAppointmentId)
      .map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at }))
    const blocked = ((closures ?? []) as { starts_at: string; ends_at: string }[]).map((row) => ({
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }))
    return [...visits, ...blocked]
  }

  private requireDentist(refs: Refs, id: string): Dentist {
    const dentist = refs.dentists.find((item) => item.id === id)
    if (!dentist) throw new ClinicError("NOT_FOUND", "That dentist is not on the roster.")
    return dentist
  }

  private requireService(refs: Refs, id: string): Service {
    const service = refs.services.find((item) => item.id === id)
    if (!service) throw new ClinicError("NOT_FOUND", "That service is not on the menu.")
    return service
  }

  private view(appointment: Appointment, refs: Refs): AppointmentView {
    const dentist = this.requireDentist(refs, appointment.dentistId)
    const service = this.requireService(refs, appointment.serviceId)
    return {
      ...appointment,
      dentistName: dentist.name,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    }
  }

  private draft(appointment: Appointment, refs: Refs, origin: string): ReminderDraft {
    const view = this.view(appointment, refs)
    const message = composeReminder({
      patientName: view.patientName,
      serviceName: view.serviceName,
      dentistName: view.dentistName,
      startsAt: view.startsAt,
      timeZone: refs.clinic.timezone,
      clinicName: refs.clinic.name,
      phone: refs.clinic.phone,
      manageUrl: `${origin}/visit/${view.manageToken}`,
    })
    return { ...view, ...message }
  }

  private assertRange(from: string, to: string): void {
    const span = daysBetween(from, to)
    if (span < 0 || span > 31) throw new ClinicError("VALIDATION", "Choose a range of 31 days or fewer.")
  }
}

type WorkingHourRow = {
  id: string
  dentist_id: string
  weekday: number
  start_minute: number
  end_minute: number
}

type TimeOffRow = {
  id: string
  dentist_id: string
  starts_at: string
  ends_at: string
  reason: string
}

type ReminderRow = {
  id: string
  appointment_id: string
  channel: ReminderChannel
  subject: string
  body: string
  sent_at: string
}

function toHours(row: WorkingHourRow): WorkingHours {
  return {
    id: row.id,
    dentistId: row.dentist_id,
    weekday: row.weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
  }
}

function toTimeOff(row: TimeOffRow): TimeOff {
  return {
    id: row.id,
    dentistId: row.dentist_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason,
  }
}
