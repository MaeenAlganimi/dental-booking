import type {
  AppointmentStatus,
  AppointmentView,
  Catalog,
  Dentist,
  Directory,
  ReminderDraft,
  ReminderLog,
  Service,
  Slot,
  TimeOff,
  WorkingHours,
} from "@/lib/domain/types"

export type BookInput = {
  dentistId: string
  serviceId: string
  startsAt: string
  patientName: string
  patientEmail: string
  patientPhone: string
  notes?: string
}

export type DentistInput = {
  id?: string
  name: string
  credentials: string
  focus: string
  bio: string
  color: string
  active: boolean
  serviceIds: string[]
}

export type ServiceInput = {
  id?: string
  name: string
  summary: string
  durationMinutes: number
  priceCents: number
  active: boolean
}

export type HoursInput = {
  dentistId: string
  hours: { weekday: number; startMinute: number; endMinute: number }[]
}

export type TimeOffInput = {
  dentistId: string
  date: string
  startMinute: number
  endMinute: number
  reason: string
}

export type SlotQuery = {
  dentistId: string
  serviceId: string
  from: string
  to: string
}

export interface ClinicRepository {
  getCatalog(): Promise<Catalog>
  getDirectory(): Promise<Directory>
  getSlots(query: SlotQuery): Promise<Slot[]>
  book(input: BookInput): Promise<AppointmentView>
  getByToken(token: string): Promise<AppointmentView | null>
  cancelByToken(token: string): Promise<AppointmentView>
  rescheduleByToken(token: string, startsAt: string): Promise<AppointmentView>
  listAppointments(from: string, to: string): Promise<AppointmentView[]>
  setAppointmentStatus(id: string, status: Exclude<AppointmentStatus, "booked">): Promise<AppointmentView>
  upsertDentist(input: DentistInput): Promise<Dentist>
  upsertService(input: ServiceInput): Promise<Service>
  replaceWorkingHours(input: HoursInput): Promise<WorkingHours[]>
  addTimeOff(input: TimeOffInput): Promise<TimeOff>
  removeTimeOff(id: string): Promise<void>
  listDueReminders(now: Date, origin: string): Promise<ReminderDraft[]>
  markRemindersSent(ids: string[], channel: "in_app" | "n8n", now: Date, origin: string): Promise<ReminderLog[]>
  runReminderSweep(channel: "in_app" | "n8n", now: Date, origin: string): Promise<ReminderLog[]>
  listReminderLog(): Promise<ReminderLog[]>
}
