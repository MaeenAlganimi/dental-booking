-- Halcyon clinic book.
-- Run on Supabase or any Postgres 14+ database.
-- Overlapping active visits for the same dentist are rejected by the database,
-- not only by the application. Cancelled and completed visits do not hold the chair.

create extension if not exists btree_gist;

create type appointment_status as enum ('booked', 'cancelled', 'completed');

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Los_Angeles',
  phone text not null,
  email text not null,
  address text not null,
  reminder_lead_hours integer not null default 24 check (reminder_lead_hours between 1 and 168),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 120),
  min_lead_minutes integer not null default 60 check (min_lead_minutes between 0 and 1440),
  booking_window_days integer not null default 21 check (booking_window_days between 1 and 90),
  created_at timestamptz not null default now()
);

create table dentists (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  name text not null,
  credentials text not null,
  focus text not null,
  bio text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  name text not null,
  summary text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table dentist_services (
  dentist_id uuid not null references dentists (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  primary key (dentist_id, service_id)
);

-- One window per weekday. weekday: 0 Sunday through 6 Saturday. Minutes from midnight.
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references dentists (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1440),
  end_minute integer not null check (end_minute between 1 and 1440),
  unique (dentist_id, weekday),
  check (end_minute > start_minute)
);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references dentists (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  check (ends_at > starts_at)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  dentist_id uuid not null references dentists (id),
  service_id uuid not null references services (id),
  patient_name text not null,
  patient_email text not null,
  patient_phone text not null,
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'booked',
  manage_token text not null unique,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Two booked visits for one dentist cannot overlap. A visit that ends at 11:00
-- may be followed by one that starts at 11:00. Cancelling removes the hold.
alter table appointments
  add constraint appointments_no_double_booking
  exclude using gist (
    dentist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'booked');

create index appointments_dentist_starts_idx on appointments (dentist_id, starts_at);
create index appointments_due_reminder_idx
  on appointments (starts_at)
  where status = 'booked' and reminder_sent_at is null;

create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'n8n')),
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

-- user_id matches auth.users.id on Supabase. The foreign key lives in 002_rls.sql
-- so this file also applies on vanilla Postgres (used by CI).
create table staff_profiles (
  user_id uuid primary key,
  clinic_id uuid not null references clinics (id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner', 'staff'))
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointments_set_updated_at
  before update on appointments
  for each row
  execute function set_updated_at();
