"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SiteHeader from "@/components/site-header"
import NegotiatorMark from "@/components/negotiator-mark"

export default function ResendPage() {
  const [email, setEmail] = useState("")
  const [caseRef, setCaseRef] = useState("")
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await fetch("/api/magic-link/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, caseRef }),
    })
    // Same response shown whether or not the combination matched a real
    // ticket — this page must not confirm which case refs exist.
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-cream px-4">
      <SiteHeader />
      <div className="flex items-center justify-center px-4 pt-12">
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="w-full max-w-sm bg-white rounded-panel shadow-panel p-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                  className="mx-auto mb-5 flex items-center justify-center"
                >
                  <NegotiatorMark size={56} />
                </motion.div>
                <h1 className="font-black text-xl text-cobalt-600 mb-2 text-center">Check your email</h1>
                <p className="text-sm text-ink-soft text-center">
                  If that email and negotiation ID match an active case, a new link is on its way.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <h1 className="font-black text-xl text-cobalt-600 mb-2">Lost your link?</h1>
                <p className="text-sm text-ink-muted mb-6">
                  Enter your email and negotiation ID (e.g. NEG-000123) and we&apos;ll send a fresh link if it matches.
                </p>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseRef">Negotiation ID</Label>
                    <Input
                      id="caseRef"
                      placeholder="NEG-000123"
                      value={caseRef}
                      onChange={(event) => setCaseRef(event.target.value)}
                      required
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                    <Button type="submit" className="w-full">
                      Send my link
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
