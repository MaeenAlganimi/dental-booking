import { parseInput, slotQuerySchema } from "@/lib/domain/schemas"
import { dispatch } from "@/lib/server/dispatch"

function readSlots(request: Request) {
  return dispatch(
    request,
    (store, _payload, req) => {
      const url = new URL(req.url)
      return store.getSlots(
        parseInput(slotQuerySchema, {
          dentistId: url.searchParams.get("dentistId"),
          serviceId: url.searchParams.get("serviceId"),
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
        }),
      )
    },
    { method: "GET" },
  )
}

export function GET(request: Request) {
  return readSlots(request)
}

export function POST(request: Request) {
  return readSlots(request)
}
