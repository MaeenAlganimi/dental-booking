import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { DemoBanner } from "@/components/demo-banner"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: {
    default: "Whitmore Dental",
    template: "%s · Whitmore Dental",
  },
  description:
    "Book a visit at Whitmore Dental. Choose a dentist, take an open chair, and get a reminder before you come in.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <DemoBanner />
        {children}
      </body>
    </html>
  )
}
