import Link from "next/link"
import NegotiatorMark from "@/components/negotiator-mark"

// Shared minimal header for every customer-facing screen past the hero —
// keeps the mark and wordmark present as a constant thread through the
// flow instead of each screen reverting to a bare, brandless page.
export default function SiteHeader({ tagline }: { tagline?: string }) {
  return (
    <header className="flex items-center justify-between px-6 sm:px-10 pt-8 pb-2 max-w-3xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2.5">
        <NegotiatorMark size={32} />
        <span className="font-black text-lg tracking-tight text-cobalt-600">The Negotiator</span>
      </Link>
      <div className="flex items-center gap-4">
        {tagline && <span className="hidden sm:inline text-sm italic font-serif text-ink-soft">{tagline}</span>}
        <Link
          href="/login"
          className="text-sm font-bold text-cobalt-600 opacity-80 hover:opacity-100 hover:underline underline-offset-4 transition-opacity"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}
