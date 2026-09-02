import type { Metadata } from "next"
import { Archivo, Lora } from "next/font/google"
import { MotionConfig } from "framer-motion"
import { Toaster } from "@/components/ui/sonner"
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

export const metadata: Metadata = {
  title: "The Negotiator",
  description: "You ask. We negotiate.",
  icons: {
    icon: "/favicon.svg",
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
        </MotionConfig>
      </body>
    </html>
  )
}
