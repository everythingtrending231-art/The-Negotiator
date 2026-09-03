"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCents } from "@/lib/money"
import { CaseStatus as CaseStatusEnum } from "@prisma/client"
import { cn } from "@/lib/utils"

const CASE_STATUSES = Object.values(CaseStatusEnum)

type NegotiationCase = {
  id: string
  publicRef: string
  status: string
  description: string
  url: string | null
  attachmentUrls: string[]
  targetPriceCents: number | null
  maxBudgetCents: number | null
  currency: string
  quantity: number | null
  location: string | null
  notes: string | null
  categoryName: string
  businessName: string | null
  customerPreferredBusinessName: string | null
  customerEmail: string
  assignedNegotiatorName: string | null
  escalated: boolean
  escalatedReason: string | null
}

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
  businessFeedback: string | null
}
type AuditLogRow = { id: string; action: string; actorType: string; sourceChannel: string; createdAt: string }
type Business = { id: string; name: string }
type Invite = {
  id: string
  businessId: string
  businessName: string
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN"
  responseNote: string | null
  respondedByName: string | null
  respondedAt: string | null
}

type ActionKey = "assign" | "status" | "invite" | "note" | "message" | "escalate"
type Feedback = {
  submittedAt: string | null
  savedMoney: boolean | null
  improvedDeal: boolean | null
  negotiatorRating: number | null
  wouldUseAgain: boolean | null
} | null

export default function CaseDetail(props: {
  negotiationCase: NegotiationCase
  messages: Message[]
  notes: Note[]
  offers: Offer[]
  auditLogs: AuditLogRow[]
  invites: Invite[]
  currentNegotiator: { id: string; name: string }
  businesses: Business[]
  feedback: Feedback
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<Partial<Record<ActionKey, boolean>>>({})
  const [status, setStatus] = useState(props.negotiationCase.status)
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([])
  const [showEscalateForm, setShowEscalateForm] = useState(false)
  const [escalateReason, setEscalateReason] = useState("")

  async function runAction(key: ActionKey, fn: () => Promise<Response>, successMessage: string) {
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      const res = await fn()
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? "That didn't go through.")
        return false
      }
      toast.success(successMessage)
      router.refresh()
      return true
    } catch {
      toast.error("That didn't go through — check your connection and try again.")
      return false
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
    }
  }

  async function assignToMe() {
    await runAction(
      "assign",
      () => fetch(`/api/negotiator/cases/${props.negotiationCase.id}/assign`, { method: "POST" }),
      "Assigned to you."
    )
  }

  async function sendInvites() {
    if (selectedBusinessIds.length === 0) return
    const ok = await runAction(
      "invite",
      () =>
        fetch(`/api/negotiator/cases/${props.negotiationCase.id}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessIds: selectedBusinessIds }),
        }),
      `Sent to ${selectedBusinessIds.length} business${selectedBusinessIds.length === 1 ? "" : "es"}.`
    )
    if (ok) {
      setSelectedBusinessIds([])
      setShowInviteForm(false)
    }
  }

  function toggleBusiness(businessId: string) {
    setSelectedBusinessIds((prev) =>
      prev.includes(businessId) ? prev.filter((id) => id !== businessId) : [...prev, businessId],
    )
  }

  async function updateStatus() {
    await runAction(
      "status",
      () =>
        fetch(`/api/negotiator/cases/${props.negotiationCase.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      `Status updated to ${statusLabel(status)}.`
    )
  }

  async function addNote() {
    if (!note.trim()) return
    const ok = await runAction(
      "note",
      () =>
        fetch(`/api/negotiator/cases/${props.negotiationCase.id}/note`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: note }),
        }),
      "Note added."
    )
    if (ok) setNote("")
  }

  async function escalate() {
    if (!escalateReason.trim()) return
    const ok = await runAction(
      "escalate",
      () =>
        fetch(`/api/negotiator/cases/${props.negotiationCase.id}/escalate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: escalateReason }),
        }),
      "Case escalated."
    )
    if (ok) {
      setEscalateReason("")
      setShowEscalateForm(false)
    }
  }

  async function unescalate() {
    await runAction(
      "escalate",
      () => fetch(`/api/negotiator/cases/${props.negotiationCase.id}/escalate`, { method: "DELETE" }),
      "Escalation cleared."
    )
  }

  async function sendMessage() {
    if (!message.trim()) return
    const ok = await runAction(
      "message",
      () =>
        fetch(`/api/negotiator/cases/${props.negotiationCase.id}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: message }),
        }),
      "Sent to customer."
    )
    if (ok) setMessage("")
  }

  const c = props.negotiationCase

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{c.publicRef}</p>
          <h1 className="text-2xl font-black text-cobalt-600">{c.categoryName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {c.escalated && <StatusBadge status="DISPUTED" label="Escalated" />}
          <StatusBadge status={c.status} />
        </div>
      </motion.div>

      {/* Persistent case-context panel — always visible regardless of which
          tab below is active, so the negotiator never loses the thread. */}
      <Card className="p-6 space-y-3">
        <p className="text-sm text-ink-muted">Customer: {c.customerEmail}</p>
        <p>{c.description}</p>
        {c.url && (
          <p className="text-sm">
            Link:{" "}
            <a href={c.url} className="underline text-cobalt-600">
              {c.url}
            </a>
          </p>
        )}
        <div className="text-sm text-ink-soft grid grid-cols-2 gap-1">
          {c.targetPriceCents != null && <p>Target price: {formatCents(c.targetPriceCents, c.currency)}</p>}
          {c.maxBudgetCents != null && <p>Max budget: {formatCents(c.maxBudgetCents, c.currency)}</p>}
          {c.quantity != null && <p>Quantity: {c.quantity}</p>}
          {c.location && <p>Location: {c.location}</p>}
        </div>
        {c.notes && <p className="text-sm text-ink-muted">Notes: {c.notes}</p>}
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
        {c.customerPreferredBusinessName && (
          <p className="text-sm text-ink-soft">
            Customer&apos;s pick: {c.customerPreferredBusinessName}{" "}
            <span className="text-xs text-ink-muted">(non-binding — not yet the locked-in business)</span>
          </p>
        )}
        {c.businessName && <p className="text-sm text-ink-soft">Business: {c.businessName}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <p className="text-sm text-ink-soft">Assigned: {c.assignedNegotiatorName ?? "Unassigned"}</p>
          <Button size="sm" disabled={busy.assign} onClick={assignToMe}>
            {busy.assign ? "Assigning…" : "Assign to me"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy.status} onClick={updateStatus}>
            {busy.status ? "Updating…" : "Update status"}
          </Button>
        </div>

        <div className="pt-3 border-t border-border space-y-3">
          {c.escalated ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-rose-700">Escalated</p>
                {c.escalatedReason && <p className="text-sm text-ink-muted">{c.escalatedReason}</p>}
              </div>
              <Button size="sm" variant="outline" disabled={busy.escalate} onClick={unescalate}>
                {busy.escalate ? "Clearing…" : "Clear escalation"}
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowEscalateForm((v) => !v)}>
                {showEscalateForm ? "Cancel" : "Escalate this case"}
              </Button>
              <AnimatePresence>
                {showEscalateForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden space-y-2"
                  >
                    <Textarea
                      rows={2}
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Why does this need escalation? (value threshold, legal terms, relationship risk, dispute, lacks authority, safety/compliance…)"
                    />
                    <Button size="sm" variant="destructive" disabled={busy.escalate || !escalateReason.trim()} onClick={escalate}>
                      {busy.escalate ? "Escalating…" : "Confirm escalation"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Requests</TabsTrigger>
          <TabsTrigger value="offers">Offers ({props.offers.length})</TabsTrigger>
          <TabsTrigger value="conversation">Messages &amp; notes</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-cobalt-600">Requests sent</h2>
              <Button size="sm" variant="outline" onClick={() => setShowInviteForm((v) => !v)}>
                {showInviteForm ? "Cancel" : "Send request"}
              </Button>
            </div>
            <p className="text-xs text-ink-muted">
              Route this request to one or more businesses so they can see it and decide whether to engage, before
              any offer terms exist. Once you draft an offer for one, any other still-pending requests are withdrawn
              automatically.
            </p>

            {props.invites.length === 0 && <p className="text-sm text-ink-muted">No requests sent yet.</p>}
            <div className="space-y-2">
              {props.invites.map((invite) => (
                <div key={invite.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{invite.businessName}</p>
                    {invite.responseNote && (
                      <p className="text-xs text-ink-muted">&ldquo;{invite.responseNote}&rdquo;</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-ink-muted">
                    <StatusBadge status={invite.status} />
                    {invite.respondedByName && (
                      <p className="mt-1">
                        {invite.respondedByName} · {new Date(invite.respondedAt!).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {showInviteForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {props.businesses.map((business) => {
                        const alreadyInvited = props.invites.some((i) => i.businessId === business.id)
                        return (
                          <label
                            key={business.id}
                            className={cn("flex items-center gap-2 text-sm", alreadyInvited && "text-ink-muted/50")}
                          >
                            <input
                              type="checkbox"
                              disabled={alreadyInvited}
                              checked={selectedBusinessIds.includes(business.id)}
                              onChange={() => toggleBusiness(business.id)}
                            />
                            {business.name}
                            {alreadyInvited && " (already invited)"}
                          </label>
                        )
                      })}
                    </div>
                    <Button size="sm" disabled={busy.invite || selectedBusinessIds.length === 0} onClick={sendInvites}>
                      {busy.invite
                        ? "Sending…"
                        : `Send to ${selectedBusinessIds.length || ""} business${selectedBusinessIds.length === 1 ? "" : "es"}`}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </TabsContent>

        <TabsContent value="offers">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-cobalt-600">Offers</h2>
              <Button size="sm" variant="outline" onClick={() => setShowOfferForm((v) => !v)}>
                {showOfferForm ? "Cancel" : "New offer"}
              </Button>
            </div>
            <p className="text-xs text-ink-muted">
              After negotiating terms with the business by phone, draft the offer here — the business must confirm
              it via their portal before the customer ever sees it.
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
                  <div className="mt-2 pt-2 border-t border-border text-xs">
                    {offer.businessConfirmedAt ? (
                      <p className="text-emerald-700 font-bold">
                        Confirmed by {offer.businessContactName ?? "business"} on{" "}
                        {new Date(offer.businessConfirmedAt).toLocaleString()}
                      </p>
                    ) : offer.businessFeedback ? (
                      <p className="text-amber-800 font-bold">Business requested changes: {offer.businessFeedback}</p>
                    ) : (
                      <p className="text-ink-muted">Awaiting business confirmation</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {showOfferForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <OfferForm
                    caseId={c.id}
                    businesses={props.businesses}
                    defaultCurrency={c.currency}
                    maxBudgetCents={c.maxBudgetCents}
                    onDone={() => {
                      setShowOfferForm(false)
                      toast.success("Offer created — awaiting business confirmation.")
                      router.refresh()
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Internal notes</h2>
            <p className="text-xs text-ink-muted">Never visible to the customer.</p>
            <div className="space-y-2">
              {props.notes.map((n) => (
                <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-ink-muted">
                    {n.negotiatorName} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm">{n.body}</p>
                </div>
              ))}
            </div>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note…" />
            <Button size="sm" disabled={busy.note || !note.trim()} onClick={addNote}>
              {busy.note ? "Adding…" : "Add note"}
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Messages with customer</h2>
            <div className="space-y-2">
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
            <Textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the customer a question…"
            />
            <Button size="sm" disabled={busy.message || !message.trim()} onClick={sendMessage}>
              {busy.message ? "Sending…" : "Send to customer"}
            </Button>
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
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Your rating</dt>
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
    </div>
  )
}

function OfferForm(props: {
  caseId: string
  businesses: Business[]
  defaultCurrency: string
  maxBudgetCents: number | null
  onDone: () => void
}) {
  const [businessId, setBusinessId] = useState(props.businesses[0]?.id ?? "")
  const [finalPrice, setFinalPrice] = useState("")
  const [originalValue, setOriginalValue] = useState("")
  const [includedGoods, setIncludedGoods] = useState("")
  const [additionalBenefits, setAdditionalBenefits] = useState("")
  const [conditions, setConditions] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [deliveryTerms, setDeliveryTerms] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalPriceCents = Math.round(parseFloat(finalPrice) * 100)
  const overBudget =
    props.maxBudgetCents != null && !Number.isNaN(finalPriceCents) && finalPriceCents > props.maxBudgetCents

  async function submit() {
    if (!businessId || !finalPrice || !includedGoods.trim()) {
      setError("Business, final price, and included goods are required.")
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/negotiator/cases/${props.caseId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        finalPrice,
        originalValue: originalValue || undefined,
        currency: props.defaultCurrency,
        includedGoods,
        additionalBenefits: additionalBenefits || undefined,
        conditions: conditions || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryTerms: deliveryTerms || undefined,
        validUntil: validUntil || undefined,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const message = body?.error ?? "Couldn't create the offer."
      setError(message)
      toast.error(message)
      return
    }
    props.onDone()
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="new-offer-business">Business</Label>
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger id="new-offer-business">
              <SelectValue placeholder="Choose a business" />
            </SelectTrigger>
            <SelectContent>
              {props.businesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-offer-final-price">Final price ($)</Label>
          <Input id="new-offer-final-price" inputMode="decimal" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-offer-original-value">Original value ($, optional)</Label>
          <Input id="new-offer-original-value" inputMode="decimal" value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-offer-valid-until">Valid until</Label>
          <Input id="new-offer-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>

      {overBudget && (
        <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This price is above the customer&apos;s stated max budget
          {props.maxBudgetCents != null && ` (${formatCents(props.maxBudgetCents, props.defaultCurrency)})`}. Per
          the negotiation SOP, don&apos;t exceed the customer&apos;s max without approval — double-check before
          creating this offer.
        </p>
      )}

      <div className="space-y-1">
        <Label>Included goods / services</Label>
        <Textarea rows={2} value={includedGoods} onChange={(e) => setIncludedGoods(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Additional benefits</Label>
          <Input value={additionalBenefits} onChange={(e) => setAdditionalBenefits(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Conditions</Label>
          <Input value={conditions} onChange={(e) => setConditions(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Payment terms</Label>
          <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Delivery terms</Label>
          <Input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button size="sm" disabled={submitting} onClick={submit}>
        {submitting ? "Saving…" : "Create offer"}
      </Button>
    </div>
  )
}
