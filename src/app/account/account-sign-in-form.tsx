"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import NegotiatorMark from "@/components/negotiator-mark"

export default function AccountSignInForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await fetch("/api/account/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    // Same response shown whether or not this email has an account yet —
    // requesting a link creates one on first use, and this page must not
    // confirm which emails already have one.
    setSent(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="w-full max-w-sm bg-white rounded-panel shadow-panel p-8"
    >
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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
              We&apos;ve sent a sign-in link to that address if it matches an account — or started one for you if
              it&apos;s your first time.
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="font-black text-xl text-cobalt-600 mb-2">Your account</h1>
            <p className="text-sm text-ink-muted mb-6">
              Track every request you&apos;ve sent us in one place. Optional — never required to submit or track a
              single request.
            </p>
            {searchParams.get("error") === "invalid" && (
              <p className="text-sm text-destructive mb-4">
                That link is no longer valid — request a fresh one below.
              </p>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Button type="submit" className="w-full">
                  Send me a link
                </Button>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
