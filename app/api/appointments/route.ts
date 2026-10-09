import { bookSchema, parseInput } from "@/lib/domain/schemas"
import { dispatch } from "@/lib/server/dispatch"

export function POST(request: Request) {
  return dispatch(request, (store, payload) => store.book(parseInput(bookSchema, payload)), { method: "POST" })
}
