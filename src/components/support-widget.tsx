"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const SPRING = { type: "spring" as const, stiffness: 260, damping: 24 }

// Staff-only surfaces have their own internal channels — this is a
// customer/prospect entry point, not shown there.
const HIDDEN_PATH_PREFIXES = ["/admin", "/negotiator", "/business", "/login"]

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function SupportWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    }
  }, [open])

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation()
      handleClose()
      return
    }
    if (e.key !== "Tab" || !panelRef.current) return
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (HIDDEN_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null
  }

  async function handleSend() {
    if (!email.trim() || !message.trim()) {
      toast.error("Enter your email and a message.")
      return
    }
    setSending(true)
    const res = await fetch("/api/support-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message, sourcePage: pathname }),
    })
    setSending(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't send that — please try again.")
      return
    }
    setSent(true)
  }

  function handleClose() {
    setOpen(false)
    triggerRef.current?.focus()
    // Reset only after the close animation would've settled, so a
    // reopened widget within the same visit doesn't flash back to a
    // half-filled form mid-transition.
    setTimeout(() => {
      setSent(false)
      setMessage("")
    }, 300)
  }

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close support chat" : "Chat with support"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-cobalt-600 text-white shadow-panel flex items-center justify-center"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Support chat"
            onKeyDown={handlePanelKeyDown}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={SPRING}
            className="fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] max-w-sm bg-white rounded-2xl shadow-panel border border-border p-5"
          >
            {sent ? (
              <div className="space-y-3">
                <p className="font-bold text-cobalt-600">Message sent.</p>
                <p className="text-sm text-ink-soft">
                  We got your message — we&apos;ll follow up by email at {email}.
                </p>
                <Button size="sm" variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="font-bold text-cobalt-600">Need help?</p>
                  <p className="text-sm text-ink-muted">Send us a message — we&apos;ll reply by email.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-email">Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-message">Message</Label>
                  <Textarea
                    id="support-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                  />
                </div>
                <Button size="sm" className="w-full" disabled={sending} onClick={handleSend}>
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
