import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="border-b border-line/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="block">
          <p className="text-[0.68rem] tracking-[0.22em] text-brass">HALCYON</p>
          <p className="font-serif text-xl leading-none">Whitmore Dental</p>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#services" className="hidden text-ink-soft sm:inline">
            Services
          </Link>
          <Link href="/#dentists" className="hidden text-ink-soft sm:inline">
            Dentists
          </Link>
          <Link href="/login" className="text-ink-soft">
            Staff
          </Link>
          <Link href="/book" className="btn">
            Book a visit
          </Link>
        </nav>
      </div>
    </header>
  )
}
