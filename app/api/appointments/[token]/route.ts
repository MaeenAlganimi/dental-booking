import { ClinicError } from "@/lib/errors"
import { dispatch } from "@/lib/server/dispatch"

function readVisit(request: Request, context: { params: Promise<{ token: string }> }) {
  return dispatch(
    request,
    async (store) => {
      const { token } = await context.params
      const visit = await store.getByToken(token)
      if (!visit) throw new ClinicError("NOT_FOUND", "We could not find that visit. The link may be out of date.")
      return visit
    },
    { method: "GET" },
  )
}

export function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return readVisit(request, context)
}

export function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return readVisit(request, context)
}
