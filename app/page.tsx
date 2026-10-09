import Link from "next/link"
import { NextOpenings } from "@/components/next-openings"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const services = [
  ["New patient exam", "60 min", "$95", "A full look and a plan before anything else is scheduled."],
  ["Routine cleaning", "60 min", "$145", "Polish, a gum check, and a dentist glance if something looks off."],
  ["Deep cleaning", "90 min", "$280", "For gums that need more than a routine visit."],
  ["Whitening consult", "30 min", "$60", "Whether to whiten, and which way. Treatment is booked after."],
  ["Crown prep", "90 min", "$420", "Numbing, shaping, and a temporary. The seat visit is booked before you leave."],
  ["Emergency visit", "40 min", "$180", "Tooth pain, a lost crown, swelling. Call if you cannot wait."],
]

const dentists = [
  ["Amira Shah, DDS", "Restorative", "Crowns, fractures, and the fillings people postpone."],
  ["Jonah Ellison, DMD", "Implants", "The longer cases, planned before the chair is held."],
  ["Priya Raman, DDS", "Prevention", "Cleanings and the six-month rhythm most of the book is built around."],
  ["Elena Voss, DDS", "Children", "First visits paced slowly. Parents stay in the room. Saturdays too."],
]

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="content">
        <section className="mx-auto grid max-w-6xl items-end gap-12 px-6 pb-8 pt-14 md:grid-cols-[1.25fr_0.85fr] md:pt-20">
          <div>
            <p className="eyebrow">Portland</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
              The chair, reserved without the phone tag.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              Whitmore books exams, cleanings, and the longer work against the real day. You pick the dentist and the
              time. The desk sends the reminder.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn" href="/book">
                Book a visit
              </Link>
              <a className="btn btn-secondary" href="#services">
                See the menu
              </a>
            </div>
          </div>
          <NextOpenings />
        </section>

        <section id="services" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-16">
          <div className="max-w-xl">
            <p className="eyebrow">Menu</p>
            <h2 className="mt-2 font-serif text-4xl">What the chair is for</h2>
          </div>
          <div className="mt-8">
            {services.map(([name, duration, price, summary]) => (
              <div key={name} className="menu-row">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="mt-1 max-w-xl text-sm text-ink-soft">{summary}</p>
                </div>
                <p className="text-right text-sm text-ink-soft">
                  {duration}
                  <span className="mt-1 block font-serif text-xl text-ink">{price}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="dentists" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-4">
          <p className="eyebrow">Dentists</p>
          <h2 className="mt-2 font-serif text-4xl">Who you will see</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {dentists.map(([name, focus, bio]) => (
              <article key={name} className="sheet p-5">
                <p className="text-sm text-brass">{focus}</p>
                <h3 className="mt-1 font-serif text-2xl">Dr. {name.replace(", DDS", "").replace(", DMD", "")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{bio}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            ["01", "Choose the work", "A cleaning is not a crown prep. The length of the visit comes from the service, not a guess."],
            ["02", "Take an open time", "The book only offers minutes the dentist is actually in. Two people cannot hold the same chair."],
            ["03", "Get the reminder", "A day before, the desk writes. The same link moves or cancels the visit."],
          ].map(([index, title, body]) => (
            <div key={index}>
              <p className="font-serif text-3xl text-brass">{index}</p>
              <h2 className="mt-2 font-serif text-2xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
