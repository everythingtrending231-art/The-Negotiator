"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import StatusBadge from "@/components/status-badge"

type Ticket = {
  id: string
  status: string
  caseStatus: string
  publicRef: string
  categoryName: string
  createdAt: string
}

export default function AccountTicketList({ tickets }: { tickets: Ticket[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function openCase(ticketId: string) {
    setBusyId(ticketId)
    const res = await fetch(`/api/account/tickets/${ticketId}/open`, { method: "POST" })
    setBusyId(null)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't open this case.")
      return
    }
    const { caseUrl } = await res.json()
    window.location.assign(caseUrl)
  }

  async function signOut() {
    await fetch("/api/account/logout", { method: "POST" })
    window.location.assign("/account")
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-6 space-y-4">
        <p className="text-sm text-ink-muted">No requests linked to this account yet.</p>
        <Button size="sm" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="p-0 overflow-hidden divide-y divide-border">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-bold text-sm">
                {t.publicRef} · {t.categoryName}
              </p>
              <p className="text-xs text-ink-muted">{new Date(t.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={t.caseStatus} />
              {t.status === "ACTIVE" ? (
                <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => openCase(t.id)}>
                  {busyId === t.id ? "Opening…" : "Open"}
                </Button>
              ) : (
                <span className="text-xs text-ink-muted">Closed</span>
              )}
            </div>
          </div>
        ))}
      </Card>
      <Button size="sm" variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  )
}
