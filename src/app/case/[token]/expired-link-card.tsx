"use client"

import { motion } from "framer-motion"
import NegotiatorMark from "@/components/negotiator-mark"

// Small client component so the motion treatment can match the rest of
// the redesign while `page.tsx` above stays a server component (it does
// the token lookup).
export default function ExpiredLinkCard() {
  return (
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
        This link isn&apos;t active
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.37 }}
        className="text-ink-muted leading-relaxed"
      >
        It may have expired, or this negotiation may already be closed — if so, we&apos;ve already emailed you the
        details. If you still need help, request a fresh link.
      </motion.p>
      <motion.a
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileHover={{ y: -3, boxShadow: "0 16px 40px -12px rgba(18,63,169,0.35)" }}
        whileTap={{ scale: 0.96 }}
        href="/resend"
        className="inline-flex mt-7 px-6 py-3.5 rounded-pill font-bold text-white bg-cobalt-600 shadow-card"
      >
        Get a new link
      </motion.a>
    </motion.div>
  )
}
