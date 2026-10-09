import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function removeClosure(request: Request, context: { params: Promise<{ id: string }> }) {
  return dispatch(
    request,
    async (store) => {
      const { id } = await context.params
      await store.removeTimeOff(id)
      return { ok: true }
    },
    { method: "DELETE", authorize: requireStaff },
  )
}

export function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return removeClosure(request, context)
}

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return removeClosure(request, context)
}
