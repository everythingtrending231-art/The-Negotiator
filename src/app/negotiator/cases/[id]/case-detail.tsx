"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCents } from "@/lib/money"

const CASE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ASSIGNED",
  "NEGOTIATING",
  "AWAITING_BUSINESS",
  "AWAITING_CUSTOMER",
  "OFFER_READY",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
  "COMPLETED",
  "DISPUTED",
  "CLOSED",
]

type NegotiationCase = {
  id: string
  publicRef: string
  status: string
  description: string
  url: string | null
  targetPriceCents: number | null
  maxBudgetCents: number | null
  currency: string
  quantity: number | null
  location: string | null
  notes: string | null
  categoryName: string
  businessName: string | null
  customerEmail: string
  assignedNegotiatorName: string | null
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
}
type AuditLogRow = { id: string; action: string; actorType: string; sourceChannel: string; createdAt: string }
type Business = { id: string; name: string }

export default function CaseDetail(props: {
  negotiationCase: NegotiationCase
  messages: Message[]
  notes: Note[]
  offers: Offer[]
  auditLogs: AuditLogRow[]
  currentNegotiator: { id: string; name: string }
  businesses: Business[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(props.negotiationCase.status)
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [showOfferForm, setShowOfferForm] = useState(false)

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function assignToMe() {
    await withBusy(() =>
      fetch(`/api/negotiator/cases/${props.negotiationCase.id}/assign`, {
        method: "POST",
      }).then(() => undefined),
    )
  }

  async function updateStatus() {
    await withBusy(() =>
      fetch(`/api/negotiator/cases/${props.negotiationCase.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(() => undefined),
    )
  }

  async function addNote() {
    if (!note.trim()) return
    await withBusy(() =>
      fetch(`/api/negotiator/cases/${props.negotiationCase.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note }),
      }).then(() => setNote("")),
    )
  }

  async function sendMessage() {
    if (!message.trim()) return
    await withBusy(() =>
      fetch(`/api/negotiator/cases/${props.negotiationCase.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      }).then(() => setMessage("")),
    )
  }

  const c = props.negotiationCase

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#F5A623" }}>
            {c.publicRef}
          </p>
          <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
            {c.categoryName}
          </h1>
        </div>
        <Badge>{c.status}</Badge>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <p className="text-sm text-slate-500">Customer: {c.customerEmail}</p>
        <p>{c.description}</p>
        {c.url && (
          <p className="text-sm">
            Link:{" "}
            <a href={c.url} className="underline" style={{ color: "#123FA9" }}>
              {c.url}
            </a>
          </p>
        )}
        <div className="text-sm text-slate-600 grid grid-cols-2 gap-1">
          {c.targetPriceCents != null && <p>Target price: {formatCents(c.targetPriceCents, c.currency)}</p>}
          {c.maxBudgetCents != null && <p>Max budget: {formatCents(c.maxBudgetCents, c.currency)}</p>}
          {c.quantity != null && <p>Quantity: {c.quantity}</p>}
          {c.location && <p>Location: {c.location}</p>}
        </div>
        {c.notes && <p className="text-sm text-slate-500">Notes: {c.notes}</p>}
        {c.businessName && <p className="text-sm text-slate-600">Business: {c.businessName}</p>}
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <p className="text-sm text-slate-600">
          Signed in as <span className="font-bold">{props.currentNegotiator.name}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <p className="text-sm text-slate-600">Assigned: {c.assignedNegotiatorName ?? "Unassigned"}</p>
          <Button size="sm" disabled={busy} onClick={assignToMe}>
            Assign to me
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy} onClick={updateStatus}>
            Update status
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: "#123FA9" }}>
            Offers
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowOfferForm((v) => !v)}>
            {showOfferForm ? "Cancel" : "New offer"}
          </Button>
        </div>

        {props.offers.length === 0 && <p className="text-sm text-slate-500">No offers yet.</p>}
        <div className="space-y-2">
          {props.offers.map((offer) => (
            <div key={offer.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-bold">{formatCents(offer.finalPriceCents, offer.currency)}</p>
                <p className="text-sm text-slate-500">{offer.includedGoods}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{offer.status}</p>
                {offer.customerDecision && <p>Customer: {offer.customerDecision}</p>}
              </div>
            </div>
          ))}
        </div>

        {showOfferForm && (
          <OfferForm
            caseId={c.id}
            businesses={props.businesses}
            defaultCurrency={c.currency}
            onDone={() => {
              setShowOfferForm(false)
              router.refresh()
            }}
          />
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Internal notes
        </h2>
        <p className="text-xs text-slate-400">Never visible to the customer.</p>
        <div className="space-y-2">
          {props.notes.map((n) => (
            <div key={n.id} className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                {n.negotiatorName} · {new Date(n.createdAt).toLocaleString()}
              </p>
              <p className="text-sm">{n.body}</p>
            </div>
          ))}
        </div>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note…" />
        <Button size="sm" disabled={busy || !note.trim()} onClick={addNote}>
          Add note
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Messages with customer
        </h2>
        <div className="space-y-2">
          {props.messages.map((m) => (
            <div key={m.id}>
              <p className="text-xs text-slate-400">
                {m.authorType === "CUSTOMER" ? "Customer" : m.authorName ?? "Negotiator"} ·{" "}
                {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="text-sm bg-slate-100 rounded-lg px-3 py-2 inline-block">{m.body}</p>
            </div>
          ))}
        </div>
        <Textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask the customer a question…"
        />
        <Button size="sm" disabled={busy || !message.trim()} onClick={sendMessage}>
          Send to customer
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Audit log
        </h2>
        <div className="space-y-1 text-xs text-slate-500">
          {props.auditLogs.map((a) => (
            <p key={a.id}>
              {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.actorType} ({a.sourceChannel})
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function OfferForm(props: {
  caseId: string
  businesses: Business[]
  defaultCurrency: string
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
      setError(body?.error ?? "Couldn't create the offer.")
      return
    }
    props.onDone()
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Business</Label>
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger>
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
          <Label>Final price ($)</Label>
          <Input inputMode="decimal" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Original value ($, optional)</Label>
          <Input inputMode="decimal" value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Valid until</Label>
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>
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
