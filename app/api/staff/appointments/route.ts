import { parseInput, rangeQuerySchema } from "@/lib/domain/schemas"
import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function readAppointments(request: Request) {
  return dispatch(
    request,
    (store, _payload, req) => {
      const url = new URL(req.url)
      const query = parseInput(rangeQuerySchema, {
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      })
      return store.listAppointments(query.from, query.to)
    },
    { method: "GET", authorize: requireStaff },
  )
}

export function GET(request: Request) {
  return readAppointments(request)
}

export function POST(request: Request) {
  return readAppointments(request)
}
