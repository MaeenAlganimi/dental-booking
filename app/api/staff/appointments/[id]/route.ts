import { parseInput, statusSchema } from "@/lib/domain/schemas"
import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function updateStatus(request: Request, context: { params: Promise<{ id: string }> }) {
  return dispatch(
    request,
    async (store, payload) => {
      const { id } = await context.params
      const input = parseInput(statusSchema, payload)
      return store.setAppointmentStatus(id, input.status)
    },
    { method: "PATCH", authorize: requireStaff },
  )
}

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateStatus(request, context)
}

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateStatus(request, context)
}
