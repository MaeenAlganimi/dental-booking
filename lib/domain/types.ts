export type AppointmentStatus = "booked" | "cancelled" | "completed"

export type ReminderChannel = "in_app" | "n8n"

export type Clinic = {
  id: string
  name: string
  slug: string
  timezone: string
  phone: string
  email: string
  address: string
  reminderLeadHours: number
  slotIntervalMinutes: number
  minLeadMinutes: number
  bookingWindowDays: number
}

export type Dentist = {
  id: string
  clinicId: string
  name: string
  credentials: string
  focus: string
  bio: string
  color: string
  active: boolean
}

export type Service = {
  id: string
  clinicId: string
  name: string
  summary: string
  durationMinutes: number
  priceCents: number
  active: boolean
}

export type DentistService = {
  dentistId: string
  serviceId: string
}

export type WorkingHours = {
  id: string
  dentistId: string
  weekday: number
  startMinute: number
  endMinute: number
}

export type TimeOff = {
  id: string
  dentistId: string
  startsAt: string
  endsAt: string
  reason: string
}

export type Appointment = {
  id: string
  clinicId: string
  dentistId: string
  serviceId: string
  patientName: string
  patientEmail: string
  patientPhone: string
  notes: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  manageToken: string
  reminderSentAt: string | null
  createdAt: string
  updatedAt: string
}

export type ReminderLog = {
  id: string
  appointmentId: string
  channel: ReminderChannel
  subject: string
  body: string
  sentAt: string
}

export type Snapshot = {
  version: 1
  clinic: Clinic
  dentists: Dentist[]
  services: Service[]
  dentistServices: DentistService[]
  workingHours: WorkingHours[]
  timeOff: TimeOff[]
  appointments: Appointment[]
  reminderLog: ReminderLog[]
}

export type Slot = {
  startsAt: string
  endsAt: string
}

export type Catalog = {
  clinic: Clinic
  dentists: Dentist[]
  services: Service[]
  dentistServices: DentistService[]
}

export type Directory = {
  dentists: Dentist[]
  services: Service[]
  dentistServices: DentistService[]
  workingHours: WorkingHours[]
  timeOff: TimeOff[]
}

export type AppointmentView = Appointment & {
  dentistName: string
  serviceName: string
  durationMinutes: number
  priceCents: number
}

export type ReminderDraft = AppointmentView & {
  subject: string
  body: string
}
