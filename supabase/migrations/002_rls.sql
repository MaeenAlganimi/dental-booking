-- Supabase-only policies. Requires auth.uid(). Do not run this file on vanilla Postgres.
-- The Next.js server writes with the service role, which bypasses RLS.
-- These policies are the backstop if the anon key is ever used from a browser.

alter table clinics enable row level security;
alter table dentists enable row level security;
alter table services enable row level security;
alter table dentist_services enable row level security;
alter table working_hours enable row level security;
alter table time_off enable row level security;
alter table appointments enable row level security;
alter table reminder_log enable row level security;
alter table staff_profiles enable row level security;

alter table staff_profiles
  drop constraint if exists staff_profiles_user_id_fkey;

alter table staff_profiles
  add constraint staff_profiles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

grant usage on schema public to anon, authenticated;

grant select on clinics, dentists, services, dentist_services to anon, authenticated;
grant select, insert, update, delete on dentists, services, dentist_services, working_hours, time_off, appointments, reminder_log to authenticated;
grant select on staff_profiles to authenticated;

create policy clinics_public_read on clinics
  for select to anon, authenticated
  using (true);

create policy dentists_public_read on dentists
  for select to anon, authenticated
  using (active = true);

create policy services_public_read on services
  for select to anon, authenticated
  using (active = true);

create policy dentist_services_public_read on dentist_services
  for select to anon, authenticated
  using (true);

create policy staff_manage_dentists on dentists
  for all to authenticated
  using (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = dentists.clinic_id
  ))
  with check (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = dentists.clinic_id
  ));

create policy staff_manage_services on services
  for all to authenticated
  using (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = services.clinic_id
  ))
  with check (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = services.clinic_id
  ));

create policy staff_manage_links on dentist_services
  for all to authenticated
  using (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = dentist_services.dentist_id
      and staff_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = dentist_services.dentist_id
      and staff_profiles.user_id = auth.uid()
  ));

create policy staff_manage_hours on working_hours
  for all to authenticated
  using (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = working_hours.dentist_id
      and staff_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = working_hours.dentist_id
      and staff_profiles.user_id = auth.uid()
  ));

create policy staff_manage_time_off on time_off
  for all to authenticated
  using (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = time_off.dentist_id
      and staff_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from dentists
    join staff_profiles on staff_profiles.clinic_id = dentists.clinic_id
    where dentists.id = time_off.dentist_id
      and staff_profiles.user_id = auth.uid()
  ));

-- Patients do not read appointments through the anon key. Booking goes through
-- the server, which uses the service role. Staff can read and update their clinic.
create policy staff_read_appointments on appointments
  for select to authenticated
  using (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = appointments.clinic_id
  ));

create policy staff_update_appointments on appointments
  for update to authenticated
  using (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = appointments.clinic_id
  ))
  with check (exists (
    select 1 from staff_profiles
    where staff_profiles.user_id = auth.uid()
      and staff_profiles.clinic_id = appointments.clinic_id
  ));

create policy staff_read_reminders on reminder_log
  for select to authenticated
  using (exists (
    select 1
    from appointments
    join staff_profiles on staff_profiles.clinic_id = appointments.clinic_id
    where appointments.id = reminder_log.appointment_id
      and staff_profiles.user_id = auth.uid()
  ));

create policy staff_read_own_profile on staff_profiles
  for select to authenticated
  using (user_id = auth.uid());
