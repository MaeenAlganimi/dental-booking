import { parseInput, timeOffSchema } from "@/lib/domain/schemas"
import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request) {
  return dispatch(request, (store, payload) => store.addTimeOff(parseInput(timeOffSchema, payload)), {
    method: "POST",
    authorize: requireStaff,
  })
}
