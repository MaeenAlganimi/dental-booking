-- Sample practice: Whitmore Dental. Safe to run once on an empty database.
-- Appointment times are computed from "now" in America/Los_Angeles so the
-- reminder sample stays inside the 24 hour window.

insert into clinics (
  id, name, slug, timezone, phone, email, address,
  reminder_lead_hours, slot_interval_minutes, min_lead_minutes, booking_window_days
) values (
  '11111111-1111-4111-8111-111111111111',
  'Whitmore Dental',
  'whitmore',
  'America/Los_Angeles',
  '(503) 555-0148',
  'desk@whitmore.dental',
  '418 Whitmore Avenue, Portland, OR',
  24, 30, 60, 21
);

insert into dentists (id, clinic_id, name, credentials, focus, bio, color) values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'Amira Shah', 'DDS', 'Restorative',
    'Crowns, fractures, and the fillings people postpone. Amira keeps the visit short and the explanation plain.',
    '#1b4a38'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Jonah Ellison', 'DMD', 'Implants',
    'Plans the longer cases: missing teeth, cracked molars, and visits that need more than one appointment.',
    '#9a6b32'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111111',
    'Priya Raman', 'DDS', 'Prevention',
    'Cleanings, exams, and the six-month rhythm. Priya is who most of the book is built around.',
    '#3d5a80'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111111',
    'Elena Voss', 'DDS', 'Children',
    'Sees kids through Saturday. First visits are paced slowly, and parents stay in the room.',
    '#8d3d32'
  );

insert into services (id, clinic_id, name, summary, duration_minutes, price_cents) values
  (
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111111',
    'New patient exam',
    'A full look, films if you need them, and a plan before anything is scheduled.',
    60, 9500
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '11111111-1111-4111-8111-111111111111',
    'Routine cleaning',
    'Polish, a gum check, and a dentist glance if something looks off.',
    60, 14500
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '11111111-1111-4111-8111-111111111111',
    'Deep cleaning',
    'For gums that need more than a routine visit. Booked as one longer chair.',
    90, 28000
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '11111111-1111-4111-8111-111111111111',
    'Whitening consult',
    'Whether to whiten, and which way. The treatment itself is booked after.',
    30, 6000
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '11111111-1111-4111-8111-111111111111',
    'Crown prep',
    'Numbing, shaping, and a temporary. The seat visit is booked before you leave.',
    90, 42000
  ),
  (
    '33333333-3333-4333-8333-333333333306',
    '11111111-1111-4111-8111-111111111111',
    'Emergency visit',
    'Tooth pain, a lost crown, swelling. Call the desk if you cannot wait.',
    40, 18000
  );

insert into dentist_services (dentist_id, service_id) values
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301'),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333302'),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333305'),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333304'),
  ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333301'),
  ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333305'),
  ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333306'),
  ('22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333301'),
  ('22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333302'),
  ('22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333303'),
  ('22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333304'),
  ('22222222-2222-4222-8222-222222222204', '33333333-3333-4333-8333-333333333301'),
  ('22222222-2222-4222-8222-222222222204', '33333333-3333-4333-8333-333333333302'),
  ('22222222-2222-4222-8222-222222222204', '33333333-3333-4333-8333-333333333306');

insert into working_hours (dentist_id, weekday, start_minute, end_minute) values
  ('22222222-2222-4222-8222-222222222201', 1, 480, 960),
  ('22222222-2222-4222-8222-222222222201', 2, 480, 960),
  ('22222222-2222-4222-8222-222222222201', 3, 480, 960),
  ('22222222-2222-4222-8222-222222222201', 4, 480, 960),
  ('22222222-2222-4222-8222-222222222202', 2, 540, 1020),
  ('22222222-2222-4222-8222-222222222202', 3, 540, 1020),
  ('22222222-2222-4222-8222-222222222202', 4, 540, 1020),
  ('22222222-2222-4222-8222-222222222202', 5, 540, 1020),
  ('22222222-2222-4222-8222-222222222203', 1, 480, 900),
  ('22222222-2222-4222-8222-222222222203', 2, 480, 900),
  ('22222222-2222-4222-8222-222222222203', 3, 480, 900),
  ('22222222-2222-4222-8222-222222222203', 4, 480, 900),
  ('22222222-2222-4222-8222-222222222203', 5, 480, 900),
  ('22222222-2222-4222-8222-222222222204', 3, 540, 840),
  ('22222222-2222-4222-8222-222222222204', 4, 540, 840),
  ('22222222-2222-4222-8222-222222222204', 5, 540, 840),
  ('22222222-2222-4222-8222-222222222204', 6, 540, 840);

insert into time_off (id, dentist_id, starts_at, ends_at, reason) values (
  '66666666-6666-4666-8666-666666666601',
  '22222222-2222-4222-8222-222222222202',
  (
    date_trunc('day', now() at time zone 'America/Los_Angeles')
    + interval '10 days' + interval '13 hours'
  ) at time zone 'America/Los_Angeles',
  (
    date_trunc('day', now() at time zone 'America/Los_Angeles')
    + interval '10 days' + interval '17 hours'
  ) at time zone 'America/Los_Angeles',
  'Study club'
);

insert into appointments (
  id, clinic_id, dentist_id, service_id,
  patient_name, patient_email, patient_phone, notes,
  starts_at, ends_at, status, manage_token
) values
  (
    '55555555-5555-4555-8555-555555555502',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222201',
    '33333333-3333-4333-8333-333333333305',
    'Noah Patel', 'noah.patel@example.com', '503-555-0172', '',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      + interval '5 days' + interval '10 hours'
    ) at time zone 'America/Los_Angeles',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      + interval '5 days' + interval '11 hours 30 minutes'
    ) at time zone 'America/Los_Angeles',
    'booked',
    'seed-noah-patel'
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222204',
    '33333333-3333-4333-8333-333333333301',
    'Lila Brooks', 'lila.brooks@example.com', '503-555-0164', '',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      + interval '2 days' + interval '9 hours'
    ) at time zone 'America/Los_Angeles',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      + interval '2 days' + interval '10 hours'
    ) at time zone 'America/Los_Angeles',
    'booked',
    'seed-lila-brooks'
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222203',
    '33333333-3333-4333-8333-333333333302',
    'Owen Blake', 'owen.blake@example.com', '503-555-0133', '',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      - interval '1 day' + interval '10 hours'
    ) at time zone 'America/Los_Angeles',
    (
      date_trunc('day', now() at time zone 'America/Los_Angeles')
      - interval '1 day' + interval '11 hours'
    ) at time zone 'America/Los_Angeles',
    'completed',
    'seed-owen-blake'
  );

-- Maya Chen is the reminder sample: the next daytime hour inside 24 hours.
do $$
declare
  local_now timestamp;
  candidate timestamp;
  visit timestamptz;
  day_offset integer;
  hour integer;
begin
  local_now := now() at time zone 'America/Los_Angeles';
  for day_offset in 0..1 loop
    for hour in 9..16 loop
      candidate := date_trunc('day', local_now) + make_interval(days => day_offset, hours => hour);
      if candidate >= local_now + interval '90 minutes'
         and candidate <= local_now + interval '24 hours' then
        visit := candidate at time zone 'America/Los_Angeles';
        insert into appointments (
          id, clinic_id, dentist_id, service_id,
          patient_name, patient_email, patient_phone, notes,
          starts_at, ends_at, status, manage_token
        ) values (
          '55555555-5555-4555-8555-555555555501',
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222203',
          '33333333-3333-4333-8333-333333333302',
          'Maya Chen', 'maya.chen@example.com', '503-555-0198', '',
          visit,
          visit + interval '60 minutes',
          'booked',
          'seed-maya-chen'
        );
        return;
      end if;
    end loop;
  end loop;
  raise exception 'Could not place the sample reminder inside the next 24 hours';
end $$;
