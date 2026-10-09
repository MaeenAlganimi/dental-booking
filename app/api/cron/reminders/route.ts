import { appOrigin } from "@/lib/config"
import { authorizeReminder } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function sweep(request: Request, method: "GET" | "POST") {
  return dispatch(
    request,
    (store, _payload, req) => store.runReminderSweep("in_app", new Date(), appOrigin(req.url)),
    { method, authorize: authorizeReminder },
  )
}

export function GET(request: Request) {
  return sweep(request, "GET")
}

export function POST(request: Request) {
  return sweep(request, "POST")
}
