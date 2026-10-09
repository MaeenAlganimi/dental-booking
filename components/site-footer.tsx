export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-ink-soft sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-lg text-ink">Whitmore Dental</p>
          <p>418 Whitmore Avenue, Portland, OR</p>
          <p>(503) 555-0148</p>
        </div>
        <p className="max-w-sm">
          Built by Maeen Alganimi. Halcyon is the booking desk. Whitmore is the sample practice.
        </p>
      </div>
    </footer>
  )
}
