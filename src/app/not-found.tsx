"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import NegotiatorMark from "@/components/negotiator-mark"

// Matches the tone/visual language of case/[token]/expired-link-card.tsx —
// same "state card" pattern used for every other "something's not quite
// right" screen in the app, rather than Next's raw default 404.
export default function NotFound() {
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
          Page not found
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37 }}
          className="text-ink-muted leading-relaxed"
        >
          The page you&apos;re looking for doesn&apos;t exist, or may have moved.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Link href="/">
            <motion.span
              whileHover={{ y: -3, boxShadow: "0 16px 40px -12px rgba(18,63,169,0.35)" }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex mt-7 px-6 py-3.5 rounded-pill font-bold text-white bg-cobalt-600 shadow-card"
            >
              Back to homepage
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
