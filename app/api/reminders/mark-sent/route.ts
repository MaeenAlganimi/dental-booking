import { appOrigin } from "@/lib/config"
import { markSentSchema, parseInput } from "@/lib/domain/schemas"
import { authorizeReminder } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request) {
  return dispatch(
    request,
    (store, payload, req) => {
      const input = parseInput(markSentSchema, payload)
      return store.markRemindersSent(input.ids, input.channel, new Date(), appOrigin(req.url))
    },
    { method: "POST", authorize: authorizeReminder },
  )
}
