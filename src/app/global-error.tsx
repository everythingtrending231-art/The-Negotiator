"use client"

// Catches an error thrown in the root layout itself (fonts, MotionConfig)
// rather than a page below it — error.tsx doesn't cover that case. Renders
// its own <html>/<body> since it replaces the root layout entirely when
// active, and deliberately depends on nothing beyond plain Tailwind
// classes (no framer-motion, no custom components) — this is the last
// line of defense, so it shouldn't be able to fail itself.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F7F5F0" }}>
          <div className="max-w-sm text-center bg-white rounded-2xl shadow-xl p-10">
            <h1 className="font-black text-2xl mb-3" style={{ color: "#123FA9" }}>
              Something went wrong
            </h1>
            <p className="text-gray-500 leading-relaxed mb-6">
              That&apos;s on us, not you. Try reloading the page.
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex px-6 py-3 rounded-full font-bold text-white"
              style={{ backgroundColor: "#123FA9" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
