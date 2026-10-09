import { readFileSync } from "node:fs"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { clinicId, dentistIds, serviceIds } from "@/lib/domain/ids"

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("postgres exclusion constraint", () => {
  const client = new Client({ connectionString: databaseUrl })

  beforeAll(async () => {
    await client.connect()
    await client.query(`
      drop table if exists reminder_log, appointments, time_off, working_hours, dentist_services, services, dentists, staff_profiles, clinics cascade;
      drop function if exists set_updated_at cascade;
      drop type if exists appointment_status cascade;
    `)
    await client.query(readFileSync("supabase/migrations/001_schema.sql", "utf8"))
    await client.query(readFileSync("supabase/seed.sql", "utf8"))
  })

  afterAll(async () => {
    await client.end()
  })

  it("seeds the sample clinic", async () => {
    const dentists = await client.query("select count(*)::int as count from dentists")
    const maya = await client.query("select patient_name from appointments where manage_token = 'seed-maya-chen'")
    expect(dentists.rows[0].count).toBe(4)
    expect(maya.rows[0].patient_name).toBe("Maya Chen")
  })

  it("rejects a second overlapping booked visit and allows a cancelled one", async () => {
    const firstToken = `race-${crypto.randomUUID()}`
    await client.query(
      `insert into appointments (
        clinic_id, dentist_id, service_id, patient_name, patient_email, patient_phone,
        starts_at, ends_at, status, manage_token
      ) values ($1, $2, $3, 'First', 'first@example.com', '503-555-0100',
        '2030-06-03T16:00:00Z', '2030-06-03T17:00:00Z', 'booked', $4)`,
      [clinicId, dentistIds.shah, serviceIds.exam, firstToken],
    )

    await expect(
      client.query(
        `insert into appointments (
          clinic_id, dentist_id, service_id, patient_name, patient_email, patient_phone,
          starts_at, ends_at, status, manage_token
        ) values ($1, $2, $3, 'Overlap', 'overlap@example.com', '503-555-0101',
          '2030-06-03T16:30:00Z', '2030-06-03T17:30:00Z', 'booked', $4)`,
        [clinicId, dentistIds.shah, serviceIds.exam, `overlap-${crypto.randomUUID()}`],
      ),
    ).rejects.toMatchObject({ code: "23P01" })

    await client.query(
      `insert into appointments (
        clinic_id, dentist_id, service_id, patient_name, patient_email, patient_phone,
        starts_at, ends_at, status, manage_token
      ) values ($1, $2, $3, 'Adjacent', 'adjacent@example.com', '503-555-0102',
        '2030-06-03T17:00:00Z', '2030-06-03T18:00:00Z', 'booked', $4)`,
      [clinicId, dentistIds.shah, serviceIds.exam, `adjacent-${crypto.randomUUID()}`],
    )

    await client.query(
      `insert into appointments (
        clinic_id, dentist_id, service_id, patient_name, patient_email, patient_phone,
        starts_at, ends_at, status, manage_token
      ) values ($1, $2, $3, 'Cancelled overlap', 'cancelled@example.com', '503-555-0103',
        '2030-06-03T16:15:00Z', '2030-06-03T16:45:00Z', 'cancelled', $4)`,
      [clinicId, dentistIds.shah, serviceIds.exam, `cancelled-${crypto.randomUUID()}`],
    )
  })

  it("lets only one of two concurrent inserts win", async () => {
    const other = new Client({ connectionString: databaseUrl })
    await other.connect()
    const write = (holder: Client, token: string) =>
      holder.query(
        `insert into appointments (
          clinic_id, dentist_id, service_id, patient_name, patient_email, patient_phone,
          starts_at, ends_at, status, manage_token
        ) values ($1, $2, $3, 'Race', 'race@example.com', '503-555-0199',
          '2031-01-06T18:00:00Z', '2031-01-06T19:00:00Z', 'booked', $4)`,
        [clinicId, dentistIds.ellison, serviceIds.exam, token],
      )
    const results = await Promise.allSettled([
      write(client, `race-a-${crypto.randomUUID()}`),
      write(other, `race-b-${crypto.randomUUID()}`),
    ])
    await other.end()
    const failures = results.filter((result) => result.status === "rejected")
    const successes = results.filter((result) => result.status === "fulfilled")
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    expect((failures[0] as PromiseRejectedResult).reason).toMatchObject({ code: "23P01" })
  })
})
