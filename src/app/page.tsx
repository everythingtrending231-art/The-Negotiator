import Link from "next/link"
import NegotiatorMark from "@/components/negotiator-mark"

function Squiggle({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
      <path
        d="M20 170 C 20 120, 90 140, 90 90 C 90 50, 40 60, 40 30"
        fill="none"
        stroke="#123FA9"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="1"
        pathLength={1}
        className="animate-[draw-line_1.6s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]"
      />
    </svg>
  )
}

function ValueBadge({ label, delay }: { label: string; delay: string }) {
  return (
    <span
      className="inline-flex items-center px-4 py-2 rounded-pill text-sm font-bold border-2 border-cobalt-600 text-cobalt-600 animate-fade-up"
      style={{ animationDelay: delay }}
    >
      {label}
    </span>
  )
}

const STEPS = [
  { n: "01", title: "You ask", body: "Tell us what you're trying to buy, book, or get — takes about two minutes." },
  { n: "02", title: "We negotiate", body: "Your Negotiator works the business directly, by phone, on your behalf." },
  { n: "03", title: "You decide", body: "Review the confirmed offer and accept, decline, or ask for another round." },
]

export default function HomePage() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col bg-cream">
      {/* decorative marks — traced on load, not static clip-art */}
      <Squiggle className="absolute -top-6 -left-10 w-40 h-40 opacity-60" />
      <Squiggle className="absolute bottom-24 -right-10 w-52 h-52 opacity-40" flip />

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-14 pt-8">
        <div className="flex items-center gap-2.5">
          <NegotiatorMark size={40} />
          <span className="font-black text-xl tracking-tight text-cobalt-600">The Negotiator</span>
        </div>
        <span className="hidden sm:inline text-base italic font-serif text-ink-soft">
          You ask. We negotiate.
        </span>
      </header>

      {/* main split hero */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-14 px-6 sm:px-14 py-16 max-w-7xl mx-auto w-full">
        {/* left: copy + CTAs */}
        <section className="flex-1 max-w-xl">
          <span
            className="inline-block px-4 py-1.5 rounded-pill text-xs font-bold uppercase tracking-wide mb-6 bg-amber-500 text-ink animate-fade-up"
          >
            #DontAcceptTheFirstOffer
          </span>

          <h1 className="font-black text-display-lg text-cobalt-600 mb-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
            Don&apos;t take
            <br />
            the first price.
          </h1>

          <p className="text-lg leading-relaxed mb-8 text-ink-soft max-w-md animate-fade-up" style={{ animationDelay: "160ms" }}>
            Tell us what you&apos;re trying to buy, book, or get. Your Negotiator goes
            to work on it — you decide when the offer comes back.
          </p>

          <div className="flex flex-wrap gap-4 mb-8 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <Link href="/request" className="group">
              <span className="inline-flex px-7 py-4 rounded-pill font-bold text-white text-base bg-cobalt-600 shadow-card transition-all duration-200 ease-confident group-hover:shadow-card-lift group-hover:-translate-y-0.5 group-active:scale-[0.97]">
                Negotiate This For Me
              </span>
            </Link>
            <a href="#how-it-works" className="group">
              <span className="inline-flex px-7 py-4 rounded-pill font-bold text-base border-2 border-cobalt-600 text-cobalt-600 transition-all duration-200 ease-confident group-hover:bg-cobalt-600 group-hover:text-white">
                See how it works
              </span>
            </a>
          </div>

          <div className="flex flex-wrap gap-3">
            <ValueBadge label="Lower Price" delay="320ms" />
            <ValueBadge label="Better Terms" delay="380ms" />
            <ValueBadge label="Added Value" delay="440ms" />
          </div>
        </section>

        {/* right: framed mark + floating proof cards */}
        <section className="flex-1 flex items-center justify-center w-full max-w-md">
          <div className="relative w-full animate-scale-in" style={{ animationDelay: "200ms" }}>
            {/* main framed panel */}
            <div className="rounded-panel p-10 sm:p-14 flex items-center justify-center aspect-square bg-cobalt-600 shadow-panel">
              <NegotiatorMark size={180} onDark />
            </div>

            {/* floating status card — process, not a promised outcome */}
            <div className="absolute -top-6 -left-6 sm:-left-10 bg-white rounded-2xl shadow-panel px-5 py-4 max-w-[220px] border-4 border-cream animate-fade-up" style={{ animationDelay: "600ms" }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-amber-600">In progress</p>
              <p className="text-sm font-bold text-ink">We&apos;re negotiating with the business now</p>
            </div>

            {/* floating negotiator identity card */}
            <div className="absolute -bottom-6 -right-4 sm:-right-8 bg-white rounded-2xl shadow-panel px-5 py-3 flex items-center gap-3 border-4 border-cream animate-fade-up" style={{ animationDelay: "740ms" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-amber-500 animate-pulse-ring">
                A
              </div>
              <div>
                <p className="text-xs text-ink-muted">Your Negotiator</p>
                <p className="text-sm font-bold text-ink">Amara is on it</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* how it works — gives the secondary CTA a real destination and
          earns the promise concretely rather than leaving the hero as the
          entire page */}
      <section id="how-it-works" className="relative z-10 px-6 sm:px-14 py-16 border-t border-cobalt-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-black text-display-sm text-cobalt-600 mb-10 text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div
              className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-0.5 bg-cobalt-100"
              aria-hidden="true"
            />
            {STEPS.map((step) => (
              <div key={step.n} className="relative text-center sm:text-left">
                <div className="inline-flex w-12 h-12 rounded-full items-center justify-center bg-amber-500 text-ink font-black text-sm mb-4 relative z-10 shadow-card">
                  {step.n}
                </div>
                <h3 className="font-bold text-lg text-ink mb-1">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 px-6 sm:px-14 pb-8 pt-6 border-t border-cobalt-100">
        <span className="text-xs font-bold text-cobalt-600">© The Negotiator</span>
        <span className="text-xs text-ink-muted">
          Every negotiation handled by someone who does this for a living.
        </span>
      </footer>
    </div>
  )
}
