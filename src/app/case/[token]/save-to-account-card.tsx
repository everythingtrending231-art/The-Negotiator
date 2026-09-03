"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

// Additive and skippable per docs/11 §6b — never blocks tracking this
// case, just an optional offer to link it (and any past/future requests
// sharing this email) to a persistent account.
export default function SaveToAccountCard({ email }: { email: string }) {
  const [sent, setSent] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (dismissed) return null

  async function save() {
    setBusy(true)
    await fetch("/api/account/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setBusy(false)
    setSent(true)
  }

  return (
    <div className="rounded-lg border border-dashed border-cobalt-100 bg-cobalt-50/40 p-4 text-sm">
      {sent ? (
        <p className="text-ink-soft">
          Check your email at <strong>{email}</strong> for a link to set up your account.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-soft">
            Want to track all your requests in one place? We&apos;ll email <strong>{email}</strong> a link.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={save}>
              {busy ? "Sending…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
