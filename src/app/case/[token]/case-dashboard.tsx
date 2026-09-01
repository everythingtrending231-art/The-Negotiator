"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatCents } from "@/lib/money"

type Message = { id: string; authorType: "NEGOTIATOR" | "CUSTOMER"; body: string; createdAt: string }
type Offer = {
  id: string
  finalPriceCents: number
  currency: string
  includedGoods: string
  additionalBenefits: string | null
  conditions: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  validUntil: string | null
  status: string
  customerDecision: string | null
}

const TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CLOSED"]

export default function CaseDashboard(props: {
  token: string
  caseRef: string
  status: string
  negotiatorName: string | null
  estimatedNextUpdateAt: string | null
  messages: Message[]
  offer: Offer | null
}) {
  const router = useRouter()
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const isTerminal = TERMINAL_STATUSES.includes(props.status)
  const canDecide = props.offer && !props.offer.customerDecision && !isTerminal

  async function sendReply() {
    if (!reply.trim()) return
    setBusy(true)
    await fetch(`/api/case/${props.token}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    })
    setReply("")
    setBusy(false)
    router.refresh()
  }

  async function decide(decision: "ACCEPTED" | "DECLINED" | "REQUESTED_ANOTHER_ROUND") {
    if (!props.offer) return
    setBusy(true)
    setNotice(null)
    const res = await fetch(`/api/case/${props.token}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, offerId: props.offer.id }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setNotice(body?.error ?? "Something went wrong.")
      return
    }
    router.refresh()
  }

  async function resend() {
    setBusy(true)
    setNotice(null)
    const res = await fetch(`/api/case/${props.token}/resend`, { method: "POST" })
    setBusy(false)
    setNotice(res.ok ? "A fresh link is on its way to your email." : "Couldn't resend right now — try again shortly.")
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#F5A623" }}>
            {props.caseRef}
          </p>
          <h1 className="text-2xl font-black mb-1" style={{ color: "#123FA9" }}>
            {formatStatus(props.status)}
          </h1>
          {props.negotiatorName && (
            <p className="text-sm text-slate-600">Your Negotiator: {props.negotiatorName}</p>
          )}
          {props.estimatedNextUpdateAt && (
            <p className="text-sm text-slate-500">
              Next update expected around {new Date(props.estimatedNextUpdateAt).toLocaleString()}
            </p>
          )}
          {isTerminal && (
            <p className="text-sm text-slate-500 mt-2">
              This case is closed. A summary was sent to your email — this page will no longer update.
            </p>
          )}
        </div>

        {props.offer && (
          <div className="bg-white rounded-xl shadow p-6 space-y-3">
            <h2 className="font-bold" style={{ color: "#123FA9" }}>
              Offer
            </h2>
            <p className="text-2xl font-black">{formatCents(props.offer.finalPriceCents, props.offer.currency)}</p>
            <p className="text-slate-700">{props.offer.includedGoods}</p>
            {props.offer.additionalBenefits && <p className="text-slate-600 text-sm">{props.offer.additionalBenefits}</p>}
            {props.offer.conditions && <p className="text-slate-500 text-sm">Conditions: {props.offer.conditions}</p>}
            {props.offer.paymentTerms && <p className="text-slate-500 text-sm">Payment: {props.offer.paymentTerms}</p>}
            {props.offer.deliveryTerms && <p className="text-slate-500 text-sm">Delivery: {props.offer.deliveryTerms}</p>}
            {props.offer.validUntil && (
              <p className="text-xs text-slate-400">Valid until {new Date(props.offer.validUntil).toLocaleString()}</p>
            )}

            {canDecide ? (
              <div className="flex flex-wrap gap-3 pt-2">
                <Button disabled={busy} onClick={() => decide("ACCEPTED")}>
                  Accept
                </Button>
                <Button disabled={busy} variant="outline" onClick={() => decide("REQUESTED_ANOTHER_ROUND")}>
                  Ask for another round
                </Button>
                <Button disabled={busy} variant="ghost" onClick={() => decide("DECLINED")}>
                  Decline
                </Button>
              </div>
            ) : (
              props.offer.customerDecision && (
                <p className="text-sm font-bold text-slate-500">You: {formatStatus(props.offer.customerDecision)}</p>
              )
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-bold" style={{ color: "#123FA9" }}>
            Messages
          </h2>
          {props.messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
          <div className="space-y-3">
            {props.messages.map((message) => (
              <div key={message.id} className={message.authorType === "CUSTOMER" ? "text-right" : ""}>
                <p className="text-xs text-slate-400">
                  {message.authorType === "CUSTOMER" ? "You" : "Negotiator"} ·{" "}
                  {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="inline-block bg-slate-100 rounded-lg px-3 py-2 text-sm">{message.body}</p>
              </div>
            ))}
          </div>
          {!isTerminal && (
            <div className="space-y-2 pt-2 border-t">
              <Textarea
                rows={3}
                placeholder="Ask a question or reply…"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
              <Button disabled={busy || !reply.trim()} onClick={sendReply}>
                Send
              </Button>
            </div>
          )}
        </div>

        {!isTerminal && (
          <div className="text-center">
            <Button variant="ghost" disabled={busy} onClick={resend}>
              Resend my link
            </Button>
          </div>
        )}

        {notice && <p className="text-center text-sm text-slate-600">{notice}</p>}
      </div>
    </div>
  )
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ")
}
