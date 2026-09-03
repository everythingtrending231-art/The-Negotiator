"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"
import { formatCents } from "@/lib/money"
import ConfirmDialog, { useConfirmDialog } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"

type NegotiationCase = {
  id: string
  publicRef: string
  status: string
  description: string
  attachmentUrls: string[]
  categoryName: string
  businessName: string | null
  customerEmail: string
  assignedNegotiatorId: string | null
  assignedNegotiatorName: string | null
  escalated: boolean
  escalatedReason: string | null
}
type Negotiator = { id: string; name: string }
type Message = { id: string; authorType: "NEGOTIATOR" | "CUSTOMER"; authorName: string | null; body: string; createdAt: string }
type Note = { id: string; negotiatorName: string; body: string; createdAt: string }
type Offer = {
  id: string
  finalPriceCents: number
  currency: string
  includedGoods: string
  status: string
  customerDecision: string | null
  createdAt: string
  businessConfirmedAt: string | null
  businessContactName: string | null
}
type AuditLogRow = { id: string; action: string; actorType: string; sourceChannel: string; createdAt: string }
type Feedback = {
  submittedAt: string | null
  savedMoney: boolean | null
  improvedDeal: boolean | null
  negotiatorRating: number | null
  wouldUseAgain: boolean | null
} | null

export default function AdminCaseDetail(props: {
  negotiationCase: NegotiationCase
  negotiators: Negotiator[]
  messages: Message[]
  notes: Note[]
  offers: Offer[]
  auditLogs: AuditLogRow[]
  feedback: Feedback
}) {
  const router = useRouter()
  const c = props.negotiationCase

  const [reassignTo, setReassignTo] = useState(c.assignedNegotiatorId ?? props.negotiators[0]?.id ?? "")
  const [forceCloseReason, setForceCloseReason] = useState("")
  const [busy, setBusy] = useState(false)

  const reassignConfirm = useConfirmDialog()
  const forceCloseConfirm = useConfirmDialog()

  async function reassign() {
    setBusy(true)
    const res = await fetch(`/api/admin/cases/${c.id}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negotiatorId: reassignTo }),
    })
    setBusy(false)
    reassignConfirm.setOpen(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't reassign this case.")
      return
    }
    toast.success("Case reassigned.")
    router.refresh()
  }

  async function forceClose() {
    setBusy(true)
    const res = await fetch(`/api/admin/cases/${c.id}/force-close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: forceCloseReason || undefined }),
    })
    setBusy(false)
    forceCloseConfirm.setOpen(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't force-close this case.")
      return
    }
    toast.success("Case force-closed.")
    setForceCloseReason("")
    router.refresh()
  }

  const isClosed = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CLOSED"].includes(c.status)

  const hasAcceptedOffer = props.offers.some((o) => o.customerDecision === "ACCEPTED")

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{c.publicRef}</p>
          <h1 className="text-2xl font-black text-cobalt-600">{c.categoryName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {c.escalated && <StatusBadge status="DISPUTED" label="Escalated" />}
          <StatusBadge status={c.status} />
        </div>
      </div>

      {hasAcceptedOffer && (
        <Link
          href={`/admin/cases/${c.id}/receipt`}
          className="inline-block text-sm font-bold text-cobalt-600 underline"
        >
          View deal summary →
        </Link>
      )}

      <Card className="p-6 space-y-3">
        <p className="text-sm text-ink-muted">Customer: {c.customerEmail}</p>
        <p>{c.description}</p>
        {c.attachmentUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {c.attachmentUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline text-cobalt-600"
              >
                Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
        {c.businessName && <p className="text-sm text-ink-soft">Business: {c.businessName}</p>}
        {c.escalated && c.escalatedReason && (
          <p className="text-sm text-rose-700">Escalation reason: {c.escalatedReason}</p>
        )}

        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Override: reassign</p>
          <p className="text-sm text-ink-soft">Currently assigned: {c.assignedNegotiatorName ?? "Unassigned"}</p>
          <div className="flex items-center gap-2">
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Choose a negotiator" />
              </SelectTrigger>
              <SelectContent>
                {props.negotiators.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!reassignTo || reassignTo === c.assignedNegotiatorId}
              onClick={() => reassignConfirm.setOpen(true)}
            >
              Reassign
            </Button>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Override: force-close</p>
          {isClosed ? (
            <p className="text-sm text-ink-muted">This case is already closed.</p>
          ) : (
            <>
              <Textarea
                rows={2}
                value={forceCloseReason}
                onChange={(e) => setForceCloseReason(e.target.value)}
                placeholder="Reason (optional, recorded in the audit log)"
              />
              <Button size="sm" variant="destructive" onClick={() => forceCloseConfirm.setOpen(true)}>
                Force-close case
              </Button>
            </>
          )}
        </div>
      </Card>

      <Tabs defaultValue="offers">
        <TabsList>
          <TabsTrigger value="offers">Offers ({props.offers.length})</TabsTrigger>
          <TabsTrigger value="conversation">Messages &amp; notes</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Offers</h2>
            <p className="text-xs text-ink-muted">
              Read-only here — edit offer terms from Admin → Offers.
            </p>
            {props.offers.length === 0 && <p className="text-sm text-ink-muted">No offers yet.</p>}
            <div className="space-y-2">
              {props.offers.map((offer) => (
                <div key={offer.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{formatCents(offer.finalPriceCents, offer.currency)}</p>
                      <p className="text-sm text-ink-muted">{offer.includedGoods}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={offer.status} />
                      {offer.customerDecision === "ACCEPTED" ? (
                        <p className="text-xs font-bold text-emerald-700 mt-1">Deal confirmed</p>
                      ) : (
                        offer.customerDecision && (
                          <p className="text-xs text-ink-muted mt-1">Customer: {statusLabel(offer.customerDecision)}</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Internal notes</h2>
            <div className="space-y-2">
              {props.notes.length === 0 && <p className="text-sm text-ink-muted">None.</p>}
              {props.notes.map((n) => (
                <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-ink-muted">
                    {n.negotiatorName} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm">{n.body}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Messages with customer</h2>
            <div className="space-y-2">
              {props.messages.length === 0 && <p className="text-sm text-ink-muted">None.</p>}
              {props.messages.map((m) => {
                const fromNegotiator = m.authorType === "NEGOTIATOR"
                return (
                  <div key={m.id} className={cn("flex flex-col", fromNegotiator ? "items-end" : "items-start")}>
                    <p className="text-xs text-ink-muted">
                      {fromNegotiator ? m.authorName ?? "Negotiator" : "Customer"} ·{" "}
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p
                      className={cn(
                        "text-sm rounded-lg px-3 py-2 max-w-[85%]",
                        fromNegotiator ? "bg-cobalt-50 text-cobalt-700" : "bg-slate-100 text-ink"
                      )}
                    >
                      {m.body}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-cobalt-600">Customer feedback</h2>
            {!props.feedback?.submittedAt ? (
              <p className="text-sm text-ink-muted">
                {props.feedback ? "Sent, not yet answered." : "Not sent yet — this case hasn't closed."}
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Saved money?</dt>
                  <dd>{props.feedback.savedMoney ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Improved the deal?</dt>
                  <dd>{props.feedback.improvedDeal ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Negotiator rating</dt>
                  <dd>{props.feedback.negotiatorRating} / 5</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Would use again?</dt>
                  <dd>{props.feedback.wouldUseAgain ? "Yes" : "No"}</dd>
                </div>
              </dl>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-6 space-y-2">
            <h2 className="font-bold text-cobalt-600">Audit log</h2>
            <div className="space-y-1 text-xs text-ink-muted">
              {props.auditLogs.map((a) => (
                <p key={a.id}>
                  {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.actorType} ({a.sourceChannel})
                </p>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={reassignConfirm.open}
        onOpenChange={reassignConfirm.setOpen}
        title="Reassign this case?"
        description={`This case will move from ${c.assignedNegotiatorName ?? "unassigned"} to ${
          props.negotiators.find((n) => n.id === reassignTo)?.name ?? "the selected negotiator"
        }.`}
        confirmLabel="Reassign"
        destructive={false}
        busy={busy}
        onConfirm={reassign}
      />
      <ConfirmDialog
        open={forceCloseConfirm.open}
        onOpenChange={forceCloseConfirm.setOpen}
        title="Force-close this case?"
        description="This immediately moves the case to Closed, revokes the customer's access links, and sends the closure summary email if one hasn't gone out yet. This cannot be undone from here."
        confirmLabel="Force-close"
        destructive
        busy={busy}
        onConfirm={forceClose}
      />
    </div>
  )
}
