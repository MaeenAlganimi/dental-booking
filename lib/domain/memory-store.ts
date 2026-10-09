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
import { buildSeed } from "@/lib/domain/seed"
import { generateSlots, type BusyRange } from "@/lib/domain/slots"
import { addDays, createId, createToken, daysBetween, zonedDateTime } from "@/lib/domain/time"
import type {
  Appointment,
  AppointmentStatus,
  AppointmentView,
  Catalog,
  Dentist,
  Directory,
  ReminderChannel,
  ReminderDraft,
  ReminderLog,
  Service,
  Slot,
  Snapshot,
  TimeOff,
  WorkingHours,
} from "@/lib/domain/types"
import { ClinicError } from "@/lib/errors"

export class MemoryClinicRepository implements ClinicRepository {
  private chain: Promise<unknown> = Promise.resolve()

  constructor(
    private data: Snapshot,
    private clock: () => Date,
  ) {}

  static fromSeed(now: Date, clock: () => Date = () => new Date()): MemoryClinicRepository {
    return new MemoryClinicRepository(buildSeed(now), clock)
  }

  static create(snapshot: Snapshot, clock: () => Date = () => new Date()): MemoryClinicRepository {
    return new MemoryClinicRepository(structuredClone(snapshot), clock)
  }

  snapshot(): Snapshot {
    return structuredClone(this.data)
  }

  async getCatalog(): Promise<Catalog> {
    const dentists = this.data.dentists.filter((dentist) => dentist.active)
    const services = this.data.services.filter((service) => service.active)
    return {
      clinic: structuredClone(this.data.clinic),
      dentists: structuredClone(dentists),
      services: structuredClone(services),
      dentistServices: this.data.dentistServices.filter(
        (link) => dentists.some((dentist) => dentist.id === link.dentistId) && services.some((service) => service.id === link.serviceId),
      ),
    }
  }

  async getDirectory(): Promise<Directory> {
    return {
      dentists: structuredClone(this.data.dentists),
      services: structuredClone(this.data.services),
      dentistServices: structuredClone(this.data.dentistServices),
      workingHours: structuredClone(this.data.workingHours),
      timeOff: structuredClone(this.data.timeOff),
    }
  }

  async getSlots(query: SlotQuery): Promise<Slot[]> {
    this.assertRange(query.from, query.to)
    const dentist = this.findDentist(query.dentistId)
    const service = this.findService(query.serviceId)
    if (!dentist?.active || !service?.active || !this.offers(query.dentistId, query.serviceId)) return []
    return generateSlots({
      timeZone: this.data.clinic.timezone,
      from: query.from,
      to: query.to,
      durationMinutes: service.durationMinutes,
      intervalMinutes: this.data.clinic.slotIntervalMinutes,
      workingHours: this.data.workingHours.filter((hour) => hour.dentistId === dentist.id),
      busy: this.busyFor(dentist.id),
      now: this.clock(),
      minLeadMinutes: this.data.clinic.minLeadMinutes,
    })
  }

  async book(input: BookInput): Promise<AppointmentView> {
    return this.write(() => {
      const dentist = this.requireDentist(input.dentistId)
      const service = this.requireService(input.serviceId)
      const slot = assertBookable({
        clinic: this.data.clinic,
        dentist,
        service,
        offers: this.offers(dentist.id, service.id),
        workingHours: this.data.workingHours,
        busy: this.busyFor(dentist.id),
        startsAt: input.startsAt,
        now: this.clock(),
      })
      const now = this.clock().toISOString()
      const appointment: Appointment = {
        id: createId(),
        clinicId: this.data.clinic.id,
        dentistId: dentist.id,
        serviceId: service.id,
        patientName: input.patientName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
        notes: input.notes ?? "",
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "booked",
        manageToken: createToken(),
        reminderSentAt: null,
        createdAt: now,
        updatedAt: now,
      }
      this.data.appointments.push(appointment)
      return this.view(appointment)
    })
  }

  async getByToken(token: string): Promise<AppointmentView | null> {
    const appointment = this.data.appointments.find((item) => item.manageToken === token)
    return appointment ? this.view(appointment) : null
  }

  async cancelByToken(token: string): Promise<AppointmentView> {
    return this.write(() => {
      const appointment = this.requireToken(token)
      this.assertUpcoming(appointment)
      appointment.status = "cancelled"
      appointment.updatedAt = this.clock().toISOString()
      return this.view(appointment)
    })
  }

  async rescheduleByToken(token: string, startsAt: string): Promise<AppointmentView> {
    return this.write(() => {
      const appointment = this.requireToken(token)
      this.assertUpcoming(appointment)
      const dentist = this.requireDentist(appointment.dentistId)
      const service = this.requireService(appointment.serviceId)
      const slot = assertBookable({
        clinic: this.data.clinic,
        dentist,
        service,
        offers: this.offers(dentist.id, service.id),
        workingHours: this.data.workingHours,
        busy: this.busyFor(dentist.id, appointment.id),
        startsAt,
        now: this.clock(),
      })
      appointment.startsAt = slot.startsAt
      appointment.endsAt = slot.endsAt
      appointment.reminderSentAt = null
      appointment.updatedAt = this.clock().toISOString()
      return this.view(appointment)
    })
  }

  async listAppointments(from: string, to: string): Promise<AppointmentView[]> {
    this.assertRange(from, to)
    const start = zonedDateTime(from, 0, this.data.clinic.timezone).getTime()
    const end = zonedDateTime(addDays(to, 1), 0, this.data.clinic.timezone).getTime()
    return this.data.appointments
      .filter((appointment) => {
        const at = new Date(appointment.startsAt).getTime()
        return at >= start && at < end
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((appointment) => this.view(appointment))
  }

  async setAppointmentStatus(id: string, status: Exclude<AppointmentStatus, "booked">): Promise<AppointmentView> {
    return this.write(() => {
      const appointment = this.data.appointments.find((item) => item.id === id)
      if (!appointment) throw new ClinicError("NOT_FOUND", "That visit is not on the book.")
      this.assertUpcoming(appointment)
      appointment.status = status
      appointment.updatedAt = this.clock().toISOString()
      return this.view(appointment)
    })
  }

  async upsertDentist(input: DentistInput): Promise<Dentist> {
    return this.write(() => {
      const nowId = input.id ?? createId()
      const existing = this.data.dentists.find((dentist) => dentist.id === nowId)
      const next: Dentist = {
        id: nowId,
        clinicId: this.data.clinic.id,
        name: input.name,
        credentials: input.credentials,
        focus: input.focus,
        bio: input.bio,
        color: input.color,
        active: input.active,
      }
      if (existing) Object.assign(existing, next)
      else this.data.dentists.push(next)
      this.data.dentistServices = this.data.dentistServices.filter((link) => link.dentistId !== nowId)
      for (const serviceId of input.serviceIds) {
        this.requireService(serviceId)
        this.data.dentistServices.push({ dentistId: nowId, serviceId })
      }
      return structuredClone(next)
    })
  }

  async upsertService(input: ServiceInput): Promise<Service> {
    return this.write(() => {
      const id = input.id ?? createId()
      const existing = this.data.services.find((service) => service.id === id)
      const next: Service = {
        id,
        clinicId: this.data.clinic.id,
        name: input.name,
        summary: input.summary,
        durationMinutes: input.durationMinutes,
        priceCents: input.priceCents,
        active: input.active,
      }
      if (existing) Object.assign(existing, next)
      else this.data.services.push(next)
      return structuredClone(next)
    })
  }

  async replaceWorkingHours(input: HoursInput): Promise<WorkingHours[]> {
    return this.write(() => {
      this.requireDentist(input.dentistId)
      const next = input.hours.map((hour) => ({
        id: createId(),
        dentistId: input.dentistId,
        weekday: hour.weekday,
        startMinute: hour.startMinute,
        endMinute: hour.endMinute,
      }))
      this.data.workingHours = [
        ...this.data.workingHours.filter((hour) => hour.dentistId !== input.dentistId),
        ...next,
      ]
      return structuredClone(next)
    })
  }

  async addTimeOff(input: TimeOffInput): Promise<TimeOff> {
    return this.write(() => {
      this.requireDentist(input.dentistId)
      const entry: TimeOff = {
        id: createId(),
        dentistId: input.dentistId,
        startsAt: zonedDateTime(input.date, input.startMinute, this.data.clinic.timezone).toISOString(),
        endsAt: zonedDateTime(input.date, input.endMinute, this.data.clinic.timezone).toISOString(),
        reason: input.reason,
      }
      this.data.timeOff.push(entry)
      return structuredClone(entry)
    })
  }

  async removeTimeOff(id: string): Promise<void> {
    return this.write(() => {
      const before = this.data.timeOff.length
      this.data.timeOff = this.data.timeOff.filter((entry) => entry.id !== id)
      if (this.data.timeOff.length === before) {
        throw new ClinicError("NOT_FOUND", "That closure is not on the book.")
      }
    })
  }

  async listDueReminders(now: Date, origin: string): Promise<ReminderDraft[]> {
    return selectDueReminders(this.data.appointments, now, this.data.clinic.reminderLeadHours).map((appointment) =>
      this.draft(appointment, origin),
    )
  }

  async markRemindersSent(ids: string[], channel: ReminderChannel, now: Date, origin: string): Promise<ReminderLog[]> {
    return this.write(() => {
      const sent: ReminderLog[] = []
      for (const id of ids) {
        const appointment = this.data.appointments.find((item) => item.id === id)
        if (!appointment || appointment.status !== "booked" || appointment.reminderSentAt) continue
        const draft = this.draft(appointment, origin)
        appointment.reminderSentAt = now.toISOString()
        appointment.updatedAt = now.toISOString()
        const entry: ReminderLog = {
          id: createId(),
          appointmentId: appointment.id,
          channel,
          subject: draft.subject,
          body: draft.body,
          sentAt: now.toISOString(),
        }
        this.data.reminderLog.push(entry)
        sent.push(entry)
      }
      return sent.map((entry) => structuredClone(entry))
    })
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
    return structuredClone([...this.data.reminderLog].sort((a, b) => b.sentAt.localeCompare(a.sentAt)))
  }

  private write<T>(fn: () => T): Promise<T> {
    const run = this.chain.then(() => fn())
    this.chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private busyFor(dentistId: string, ignoreAppointmentId?: string): BusyRange[] {
    return [
      ...this.data.appointments
        .filter((appointment) => appointment.dentistId === dentistId && appointment.status === "booked" && appointment.id !== ignoreAppointmentId)
        .map((appointment) => ({ startsAt: appointment.startsAt, endsAt: appointment.endsAt })),
      ...this.data.timeOff
        .filter((entry) => entry.dentistId === dentistId)
        .map((entry) => ({ startsAt: entry.startsAt, endsAt: entry.endsAt })),
    ]
  }

  private offers(dentistId: string, serviceId: string): boolean {
    return this.data.dentistServices.some((link) => link.dentistId === dentistId && link.serviceId === serviceId)
  }

  private findDentist(id: string): Dentist | undefined {
    return this.data.dentists.find((dentist) => dentist.id === id)
  }

  private findService(id: string): Service | undefined {
    return this.data.services.find((service) => service.id === id)
  }

  private requireDentist(id: string): Dentist {
    const dentist = this.findDentist(id)
    if (!dentist) throw new ClinicError("NOT_FOUND", "That dentist is not on the roster.")
    return dentist
  }

  private requireService(id: string): Service {
    const service = this.findService(id)
    if (!service) throw new ClinicError("NOT_FOUND", "That service is not on the menu.")
    return service
  }

  private requireToken(token: string): Appointment {
    const appointment = this.data.appointments.find((item) => item.manageToken === token)
    if (!appointment) throw new ClinicError("NOT_FOUND", "We could not find that visit. The link may be out of date.")
    return appointment
  }

  private assertUpcoming(appointment: Appointment): void {
    if (appointment.status !== "booked") {
      throw new ClinicError("VALIDATION", "Only an upcoming visit can be changed.")
    }
  }

  private assertRange(from: string, to: string): void {
    const span = daysBetween(from, to)
    if (span < 0 || span > 31) {
      throw new ClinicError("VALIDATION", "Choose a range of 31 days or fewer.")
    }
  }

  private view(appointment: Appointment): AppointmentView {
    const dentist = this.requireDentist(appointment.dentistId)
    const service = this.requireService(appointment.serviceId)
    return {
      ...structuredClone(appointment),
      dentistName: dentist.name,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    }
  }

  private draft(appointment: Appointment, origin: string): ReminderDraft {
    const view = this.view(appointment)
    const message = composeReminder({
      patientName: view.patientName,
      serviceName: view.serviceName,
      dentistName: view.dentistName,
      startsAt: view.startsAt,
      timeZone: this.data.clinic.timezone,
      clinicName: this.data.clinic.name,
      phone: this.data.clinic.phone,
      manageUrl: `${origin}/visit/${view.manageToken}`,
    })
    return { ...view, ...message }
  }
}
