"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatCents } from "@/lib/money"
import SiteHeader from "@/components/site-header"

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
  businessName: string | null
}

const TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CLOSED"]

// Human status language, per docs/11_UX_UI_SYSTEM.md §7 — the customer
// never sees a raw enum name. `stage` places the case on a 4-step
// timeline; several internal statuses collapse into the same visible
// stage, since the UX principle is "simpler than the internal operating
// system," not a 1:1 mirror of it.
const STAGES = ["Received", "Reviewing", "Negotiating", "Offer"] as const
type Stage = (typeof STAGES)[number]

function statusInfo(status: string): { headline: string; stage: Stage; closed: boolean } {
  switch (status) {
    case "DRAFT":
    case "SUBMITTED":
      return { headline: "Received", stage: "Received", closed: false }
    case "UNDER_REVIEW":
      return { headline: "Reviewing", stage: "Reviewing", closed: false }
    case "ASSIGNED":
      return { headline: "Your Negotiator is working on it", stage: "Negotiating", closed: false }
    case "NEGOTIATING":
      return { headline: "We're negotiating with the business now", stage: "Negotiating", closed: false }
    case "AWAITING_BUSINESS":
      return { headline: "Waiting for the business", stage: "Negotiating", closed: false }
    case "AWAITING_CUSTOMER":
      return { headline: "We're waiting on your reply", stage: "Negotiating", closed: false }
    case "OFFER_READY":
      return { headline: "Final offer ready", stage: "Offer", closed: false }
    case "ACCEPTED":
      return { headline: "Completed — you accepted the offer", stage: "Offer", closed: true }
    case "DECLINED":
      return { headline: "Completed — you declined the offer", stage: "Offer", closed: true }
    case "EXPIRED":
      return { headline: "This negotiation has expired", stage: "Offer", closed: true }
    case "CANCELLED":
      return { headline: "This negotiation was cancelled", stage: "Offer", closed: true }
    case "DISPUTED":
      return { headline: "Under review by our team", stage: "Negotiating", closed: false }
    case "COMPLETED":
    case "CLOSED":
    default:
      return { headline: "Completed — you'll find the details in your email", stage: "Offer", closed: true }
  }
}

function StatusTimeline({ stage }: { stage: Stage }) {
  const activeIndex = STAGES.indexOf(stage)
  return (
    <div className="flex items-center pt-1">
      {STAGES.map((label, i) => {
        const done = i < activeIndex
        const current = i === activeIndex
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={
                  "flex h-3.5 w-3.5 rounded-full shrink-0 transition-colors " +
                  (done
                    ? "bg-cobalt-600"
                    : current
                      ? "bg-amber-500 ring-4 ring-amber-100 animate-pulse-ring"
                      : "bg-cobalt-100")
                }
                aria-hidden="true"
              />
              <span
                className={
                  "text-[11px] font-bold uppercase tracking-wide whitespace-nowrap " +
                  (current ? "text-amber-600" : done ? "text-cobalt-600" : "text-ink-muted/60")
                }
              >
                {label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={"h-0.5 flex-1 mx-1.5 -mt-4 " + (done ? "bg-cobalt-600" : "bg-cobalt-100")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const { headline, stage } = statusInfo(props.status)

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
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <div className="max-w-2xl mx-auto pt-6 space-y-5">
        <div className="bg-white rounded-panel shadow-card p-6 sm:p-7 animate-fade-up">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">{props.caseRef}</p>
              <h1 className="font-black text-2xl sm:text-display-sm text-cobalt-600 leading-tight">{headline}</h1>
            </div>
          </div>

          {!isTerminal && <StatusTimeline stage={stage} />}

          <div className="mt-5 pt-5 border-t border-border space-y-1">
            {props.negotiatorName && (
              <p className="text-sm text-ink-soft">
                Your Negotiator: <span className="font-bold text-ink">{props.negotiatorName}</span>
              </p>
            )}
            {props.estimatedNextUpdateAt && !isTerminal && (
              <p className="text-sm text-ink-muted">
                Next update expected around {new Date(props.estimatedNextUpdateAt).toLocaleString()}
              </p>
            )}
            {isTerminal && (
              <p className="text-sm text-ink-muted">
                A summary was sent to your email — this page will no longer update.
              </p>
            )}
          </div>
        </div>

        {props.offer && (
          <div
            className="bg-cobalt-600 rounded-panel shadow-panel p-6 sm:p-8 text-white animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-2">
              {props.offer.customerDecision ? "Offer" : "Your offer is ready"}
            </p>
            <p className="font-black text-4xl sm:text-5xl mb-4 tracking-tight">
              {formatCents(props.offer.finalPriceCents, props.offer.currency)}
            </p>

            <div className="space-y-3 text-sm border-t border-white/15 pt-4">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">What&apos;s included</p>
                <p className="text-white/95">{props.offer.includedGoods}</p>
              </div>
              {props.offer.additionalBenefits && (
                <div>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">Also included</p>
                  <p className="text-white/95">{props.offer.additionalBenefits}</p>
                </div>
              )}
              {props.offer.conditions && (
                <div>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">Conditions</p>
                  <p className="text-white/95">{props.offer.conditions}</p>
                </div>
              )}
              {(props.offer.paymentTerms || props.offer.deliveryTerms) && (
                <div className="grid grid-cols-2 gap-3">
                  {props.offer.paymentTerms && (
                    <div>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">Payment</p>
                      <p className="text-white/95">{props.offer.paymentTerms}</p>
                    </div>
                  )}
                  {props.offer.deliveryTerms && (
                    <div>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">Delivery</p>
                      <p className="text-white/95">{props.offer.deliveryTerms}</p>
                    </div>
                  )}
                </div>
              )}
              {props.offer.businessName && (
                <div>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-0.5">Business</p>
                  <p className="text-white/95">{props.offer.businessName}</p>
                </div>
              )}
              {props.offer.validUntil && (
                <p className="text-white/60 text-xs pt-1">
                  Valid until {new Date(props.offer.validUntil).toLocaleString()}
                </p>
              )}
            </div>

            {canDecide ? (
              <div className="flex flex-wrap gap-3 pt-6 mt-2 border-t border-white/15">
                <Button
                  disabled={busy}
                  onClick={() => decide("ACCEPTED")}
                  className="bg-amber-500 text-ink hover:bg-amber-400 shadow-none"
                >
                  Accept
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => decide("REQUESTED_ANOTHER_ROUND")}
                  className="border-white text-white hover:bg-white hover:text-cobalt-600"
                >
                  Ask for another round
                </Button>
                <Button
                  disabled={busy}
                  variant="ghost"
                  onClick={() => decide("DECLINED")}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Decline
                </Button>
              </div>
            ) : (
              props.offer.customerDecision && (
                <p className="text-sm font-bold text-white/80 pt-4 mt-2 border-t border-white/15">
                  You: {formatStatus(props.offer.customerDecision)}
                </p>
              )
            )}
          </div>
        )}

        <div className="bg-white rounded-panel shadow-card p-6 sm:p-7 space-y-4 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <h2 className="font-bold text-ink">Messages</h2>
          {props.messages.length === 0 && (
            <p className="text-sm text-ink-muted">No messages yet — your Negotiator will reach out here if anything needs clarifying.</p>
          )}
          <div className="space-y-3">
            {props.messages.map((message) => {
              const isCustomer = message.authorType === "CUSTOMER"
              return (
                <div key={message.id} className={"flex " + (isCustomer ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[80%] " + (isCustomer ? "text-right" : "text-left")}>
                    <p className="text-xs text-ink-muted mb-1">
                      {isCustomer ? "You" : "Negotiator"} · {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p
                      className={
                        "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                        (isCustomer
                          ? "bg-cobalt-600 text-white rounded-tr-sm"
                          : "bg-cream border border-border text-ink rounded-tl-sm")
                      }
                    >
                      {message.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          {!isTerminal && (
            <div className="space-y-2 pt-3 border-t border-border">
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

        {notice && <p className="text-center text-sm text-ink-soft">{notice}</p>}
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
