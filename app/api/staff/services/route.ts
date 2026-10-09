import { parseInput, serviceSchema } from "@/lib/domain/schemas"
import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request) {
  return dispatch(request, (store, payload) => store.upsertService(parseInput(serviceSchema, payload)), {
    method: "POST",
    authorize: requireStaff,
  })
}
