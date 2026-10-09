import { dispatch } from "@/lib/server/dispatch"

async function readCatalog(request: Request) {
  return dispatch(request, (store) => store.getCatalog(), { method: "GET" })
}

export function GET(request: Request) {
  return readCatalog(request)
}

export function POST(request: Request) {
  return readCatalog(request)
}
