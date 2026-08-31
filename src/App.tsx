import NegotiatorMark from './NegotiatorMark'

const COBALT = '#123FA9'
const AMBER = '#F5A623'
const CREAM = '#F7F5F0'
const INK = '#0B1220'

function Squiggle({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      <path
        d="M20 170 C 20 120, 90 140, 90 90 C 90 50, 40 60, 40 30"
        fill="none"
        stroke={COBALT}
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ValueBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2"
      style={{ borderColor: COBALT, color: COBALT }}
    >
      {label}
    </span>
  )
}

function App() {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col"
      style={{ backgroundColor: CREAM }}
    >
      {/* decorative squiggles */}
      <Squiggle className="absolute -top-6 -left-10 w-40 h-40 opacity-70" />
      <Squiggle className="absolute bottom-24 -right-10 w-52 h-52 opacity-50" flip />
      <Squiggle className="absolute top-1/2 left-1/2 w-24 h-24 opacity-20" />

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 sm:px-14 pt-8">
        <div className="flex items-center gap-2">
          <NegotiatorMark size={36} />
          <span className="font-black text-lg tracking-tight" style={{ color: COBALT }}>
            The Negotiator
          </span>
        </div>
        <span
          className="hidden sm:inline text-sm italic"
          style={{ fontFamily: 'Lora, serif', color: '#4a4a4a' }}
        >
          You ask. We negotiate.
        </span>
      </header>

      {/* main split hero */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-8 sm:px-14 py-12 max-w-7xl mx-auto w-full">
        {/* left: copy + CTAs */}
        <section className="flex-1 max-w-xl">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-6"
            style={{ backgroundColor: AMBER, color: INK }}
          >
            #DontAcceptTheFirstOffer
          </span>

          <h1
            className="font-black leading-[1.05] mb-5"
            style={{ color: COBALT, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)' }}
          >
            Don't take
            <br />
            the first price.
          </h1>

          <p className="text-lg mb-8" style={{ color: '#333' }}>
            Tell us what you're trying to buy, book, or get. A real human
            Negotiator goes to work on it — you decide when the offer comes back.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className="px-7 py-4 rounded-full font-bold text-white text-base transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ backgroundColor: COBALT }}
            >
              Negotiate This For Me
            </button>
            <button
              className="px-7 py-4 rounded-full font-bold text-base border-2 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ borderColor: COBALT, color: COBALT }}
            >
              See How It Works
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <ValueBadge label="Lower Price" />
            <ValueBadge label="Better Terms" />
            <ValueBadge label="Added Value" />
          </div>
        </section>

        {/* right: framed mark + floating proof cards */}
        <section className="flex-1 flex items-center justify-center w-full max-w-md">
          <div className="relative w-full">
            {/* main framed panel */}
            <div
              className="rounded-[2.5rem] p-10 sm:p-14 flex items-center justify-center aspect-square"
              style={{ backgroundColor: COBALT }}
            >
              <NegotiatorMark size={180} />
            </div>

            {/* floating status card - process, not a promised outcome */}
            <div className="absolute -top-6 -left-6 sm:-left-10 bg-white rounded-2xl shadow-xl px-5 py-4 max-w-[220px] border-4" style={{ borderColor: CREAM }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: AMBER }}>
                In progress
              </p>
              <p className="text-sm font-bold" style={{ color: INK }}>
                We're negotiating with the business now
              </p>
            </div>

            {/* floating negotiator identity card */}
            <div className="absolute -bottom-6 -right-4 sm:-right-8 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border-4" style={{ borderColor: CREAM }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: AMBER }}
              >
                A
              </div>
              <div>
                <p className="text-xs" style={{ color: '#666' }}>Your Negotiator</p>
                <p className="text-sm font-bold" style={{ color: INK }}>Amara is on it</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="relative z-10 flex items-center justify-between px-8 sm:px-14 pb-8 pt-4">
        <span className="text-xs font-bold" style={{ color: COBALT }}>
          © The Negotiator
        </span>
        <span className="text-xs" style={{ color: '#666' }}>
          Human negotiators. Real deals. No robots.
        </span>
      </footer>
    </div>
  )
}

export default App
