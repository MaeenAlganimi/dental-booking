import { appOrigin } from "@/lib/config"
import { authorizeReminder } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function readDue(request: Request) {
  return dispatch(
    request,
    async (store, _payload, req) => {
      const reminders = await store.listDueReminders(new Date(), appOrigin(req.url))
      return { reminders }
    },
    { method: "GET", authorize: authorizeReminder },
  )
}

export function GET(request: Request) {
  return readDue(request)
}

export function POST(request: Request) {
  return readDue(request)
}
