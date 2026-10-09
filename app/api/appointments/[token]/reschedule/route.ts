import { parseInput, rescheduleSchema } from "@/lib/domain/schemas"
import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return dispatch(
    request,
    async (store, payload) => {
      const { token } = await context.params
      const input = parseInput(rescheduleSchema, payload)
      return store.rescheduleByToken(token, input.startsAt)
    },
    { method: "POST" },
  )
}
