"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import * as Sentry from "@sentry/nextjs"
import NegotiatorMark from "@/components/negotiator-mark"

// Next.js requires error boundaries to be Client Components. Catches any
// rendering/runtime error thrown below the root layout — without this,
// a crash shows Next's raw unstyled default error screen instead of
// something on-brand, and there's no path back for the visitor other
// than a manual reload.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="max-w-sm text-center bg-white rounded-panel shadow-panel p-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
          className="mx-auto mb-6 flex items-center justify-center opacity-90"
        >
          <NegotiatorMark size={64} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-black text-display-sm text-cobalt-600 mb-3"
        >
          Something went wrong
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37 }}
          className="text-ink-muted leading-relaxed"
        >
          That&apos;s on us, not you. Try again, or head back to the homepage.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-7"
        >
          <motion.button
            type="button"
            onClick={reset}
            whileHover={{ y: -3, boxShadow: "0 16px 40px -12px rgba(18,63,169,0.35)" }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex px-6 py-3.5 rounded-pill font-bold text-white bg-cobalt-600 shadow-card"
          >
            Try again
          </motion.button>
          <a
            href="/"
            className="inline-flex px-6 py-3.5 rounded-pill font-bold text-cobalt-600 border-2 border-cobalt-600"
          >
            Back to homepage
          </a>
        </motion.div>
      </motion.div>
    </div>
  )
}
