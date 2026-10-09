import { requireStaff } from "@/lib/server/auth"
import { dispatch } from "@/lib/server/dispatch"

function readDirectory(request: Request) {
  return dispatch(request, (store) => store.getDirectory(), { method: "GET", authorize: requireStaff })
}

export function GET(request: Request) {
  return readDirectory(request)
}

export function POST(request: Request) {
  return readDirectory(request)
}
