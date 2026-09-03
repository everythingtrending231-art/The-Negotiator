import type { Metadata } from "next"
import { Archivo, Lora } from "next/font/google"
import { MotionConfig } from "framer-motion"
import { Toaster } from "@/components/ui/sonner"
import SupportWidget from "@/components/support-widget"
import "./globals.css"

// Brand direction calls for Liberation Sans — not distributed as a webfont
// on any CDN available to this build. Archivo is the deliberate substitute:
// a humanist grotesk in the same family as Arial/Helvetica (so it keeps the
// "modern, highly legible sans-serif" brief), but with real presence at
// heavy weights, which Liberation Sans and Arial both lack — needed for
// headlines to read as headlines rather than bolded body text.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
})

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const TITLE = "The Negotiator"
const DESCRIPTION = "You ask. We negotiate. Tell us what you're trying to buy, book, or get — your Negotiator goes to work on it."

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/favicon.svg",
  },
  // opengraph-image.tsx (sibling file) is auto-detected by Next.js and
  // merged into this — no image field needed here.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: TITLE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${lora.variable}`}>
      <body>
        {/* reducedMotion="user": every framer-motion animation in the app
            automatically respects the OS-level prefers-reduced-motion
            setting (transform/layout animations snap to their end state
            instead of animating) — a single global gate instead of a
            useReducedMotion() check in every animated file. */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster position="top-right" richColors closeButton />
          <SupportWidget />
        </MotionConfig>
      </body>
    </html>
  )
}
