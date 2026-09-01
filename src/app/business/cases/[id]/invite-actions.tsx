"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function InviteActions({ caseId, inviteId }: { caseId: string; inviteId: string }) {
  const router = useRouter()
  const [showDecline, setShowDecline] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function respond(decision: "ACCEPTED" | "DECLINED") {
    setBusy(true)
    const res = await fetch(`/api/business/cases/${caseId}/invites/${inviteId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: decision === "DECLINED" ? note : undefined }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't send that.")
      return
    }
    toast.success(decision === "ACCEPTED" ? "Accepted — the Negotiator has been notified." : "Declined.")
    router.refresh()
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => respond("ACCEPTED")}>
          Accept — I&apos;ll work on this
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => setShowDecline((v) => !v)}>
          Decline
        </Button>
      </div>
      {showDecline && (
        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder="Optional — let the Negotiator know why (can't fulfill, not a fit, etc.)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => respond("DECLINED")}>
            Confirm decline
          </Button>
        </div>
      )}
    </div>
  )
}
