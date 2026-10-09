import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function readLog(request: Request) {
  return dispatch(request, (store) => store.listReminderLog(), { method: "GET", authorize: requireStaff })
}

export function GET(request: Request) {
  return readLog(request)
}

export function POST(request: Request) {
  return readLog(request)
}
