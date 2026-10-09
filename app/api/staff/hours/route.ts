import { hoursSchema, parseInput } from "@/lib/domain/schemas"
import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function saveHours(request: Request) {
  return dispatch(request, (store, payload) => store.replaceWorkingHours(parseInput(hoursSchema, payload)), {
    method: "PUT",
    authorize: requireStaff,
  })
}

export function PUT(request: Request) {
  return saveHours(request)
}

export function POST(request: Request) {
  return saveHours(request)
}
