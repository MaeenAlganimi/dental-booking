import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <p className="eyebrow">Missing page</p>
      <h1 className="mt-3 font-serif text-5xl">That page is not on the book.</h1>
      <Link className="btn mt-8" href="/">
        Back to the clinic
      </Link>
    </main>
  )
}
