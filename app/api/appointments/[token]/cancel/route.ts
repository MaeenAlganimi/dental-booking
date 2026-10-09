import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return dispatch(
    request,
    async (store) => {
      const { token } = await context.params
      return store.cancelByToken(token)
    },
    { method: "POST" },
  )
}
