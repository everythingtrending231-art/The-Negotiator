"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function OfferActions({ caseId, offerId }: { caseId: string; offerId: string }) {
  const router = useRouter()
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/business/cases/${caseId}/offer/${offerId}/confirm`, { method: "POST" })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Couldn't confirm this offer.")
      return
    }
    router.refresh()
  }

  async function requestChanges() {
    if (!note.trim()) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/business/cases/${caseId}/offer/${offerId}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Couldn't send that.")
      return
    }
    setNote("")
    setShowNote(false)
    router.refresh()
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={confirm}>
          Confirm — send to customer
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => setShowNote((v) => !v)}>
          Request changes
        </Button>
      </div>
      {showNote && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="What needs to change before you can confirm this?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button size="sm" disabled={busy || !note.trim()} onClick={requestChanges}>
            Send to Negotiator
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
