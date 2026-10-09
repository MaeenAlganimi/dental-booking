import { MemoryClinicRepository } from "@/lib/domain/memory-store"

const globalStore = globalThis as unknown as { __halcyonStore?: MemoryClinicRepository }

/** Process-local book used by cron and curl when Supabase is not configured. */
export function getProcessStore(): MemoryClinicRepository {
  if (!globalStore.__halcyonStore) {
    globalStore.__halcyonStore = MemoryClinicRepository.fromSeed(new Date(), () => new Date())
  }
  return globalStore.__halcyonStore
}
