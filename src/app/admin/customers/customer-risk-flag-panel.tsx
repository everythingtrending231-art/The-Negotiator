"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type RiskFlag = {
  id: string
  status: "OPEN" | "CLEARED"
  reason: string
  raisedByType: string
  clearedNote: string | null
  clearedAt: string | null
  clearedByType: string | null
  createdAt: string
}

export default function CustomerRiskFlagPanel(props: { email: string; riskFlags: RiskFlag[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState("")
  const [clearNote, setClearNote] = useState<Record<string, string>>({})

  const openFlag = props.riskFlags.find((f) => f.status === "OPEN")

  async function raise() {
    if (!reason.trim()) return
    setBusy(true)
    const res = await fetch("/api/admin/customers/risk-flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: props.email, reason }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't raise a risk flag.")
      return
    }
    toast.success("Risk flag raised.")
    setReason("")
    setShowForm(false)
    router.refresh()
  }

  async function clear(flagId: string) {
    const note = clearNote[flagId]?.trim()
    if (!note) return
    setBusy(true)
    const res = await fetch(`/api/admin/customers/risk-flag/${flagId}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
    setBusy(false)
    if (!res.ok) {
      toast.error("Couldn't clear this risk flag.")
      return
    }
    toast.success("Risk flag cleared.")
    setClearNote((prev) => ({ ...prev, [flagId]: "" }))
    router.refresh()
  }

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Risk flags</p>
        {openFlag && <Badge variant="danger">OPEN</Badge>}
      </div>

      {props.riskFlags.length === 0 && !showForm && <p className="text-xs text-ink-muted">None on file.</p>}

      {props.riskFlags.map((flag) => (
        <div key={flag.id} className="text-sm space-y-1">
          <p className="text-xs text-ink-muted">
            {flag.status} · raised by {flag.raisedByType} · {new Date(flag.createdAt).toLocaleString()}
          </p>
          <p>{flag.reason}</p>
          {flag.status === "CLEARED" ? (
            <p className="text-xs text-ink-muted">
              Cleared by {flag.clearedByType} · {flag.clearedAt && new Date(flag.clearedAt).toLocaleString()} —{" "}
              {flag.clearedNote}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Textarea
                rows={1}
                className="text-sm"
                placeholder="Why is this being cleared?"
                value={clearNote[flag.id] ?? ""}
                onChange={(e) => setClearNote((prev) => ({ ...prev, [flag.id]: e.target.value }))}
              />
              <Button size="sm" disabled={busy || !clearNote[flag.id]?.trim()} onClick={() => clear(flag.id)}>
                Clear
              </Button>
            </div>
          )}
        </div>
      ))}

      {!openFlag &&
        (showForm ? (
          <div className="space-y-2">
            <Textarea
              rows={2}
              placeholder="What's the concern?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={raise}>
                Confirm risk flag
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Flag this customer
          </Button>
        ))}
    </div>
  )
}
