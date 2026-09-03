"use client"

import { motion } from "framer-motion"
import NegotiatorMark from "@/components/negotiator-mark"

// Mirrors src/app/case/[token]/expired-link-card.tsx's visual language,
// but with its own copy — that card's "request a fresh link" CTA doesn't
// apply here (feedback tokens aren't resent), and "already submitted" is a
// distinct, friendlier state from "invalid," not an error to route around.
export default function FeedbackStateCard({ title, body }: { title: string; body: string }) {
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
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.37 }}
        className="text-ink-muted leading-relaxed"
      >
        {body}
      </motion.p>
    </motion.div>
  )
}
