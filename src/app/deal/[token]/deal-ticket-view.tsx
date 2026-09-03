"use client"

import NegotiatorMark from "@/components/negotiator-mark"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCents } from "@/lib/money"

export type DealTicketData = {
  publicRef: string
  businessName: string
  categoryName: string
  finalPriceCents: number
  currency: string
  includedGoods: string
  additionalBenefits: string | null
  conditions: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  validUntil: string | null
  createdAt: string
}

// Customer-facing counterpart to admin/cases/[id]/receipt/page.tsx — same
// print: Tailwind convention, but branded and with a visible print button
// since a customer (unlike Support) can't be assumed to know Ctrl+P.
export default function DealTicketView({ ticket }: { ticket: DealTicketData }) {
  return (
    <div className="max-w-xl mx-auto px-4 pb-16 print:py-0 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-ink-muted">Save or print this for your records.</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <Card className="p-8 space-y-6 border-2 border-cobalt-600 print:border-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <NegotiatorMark size={40} />
            <span className="font-black text-lg tracking-tight text-cobalt-600">The Negotiator</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Deal ticket</p>
            <p className="text-sm font-bold text-cobalt-600">{ticket.publicRef}</p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-ink-muted">Business:</span> {ticket.businessName}
          </p>
          <p>
            <span className="text-ink-muted">Category:</span> {ticket.categoryName}
          </p>
          <p>
            <span className="text-ink-muted">Issued:</span> {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
          {ticket.validUntil && (
            <p>
              <span className="text-ink-muted">Valid until:</span> {new Date(ticket.validUntil).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">Agreed price</p>
          <p className="text-3xl font-black text-cobalt-600">{formatCents(ticket.finalPriceCents, ticket.currency)}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Included</p>
            <p>{ticket.includedGoods}</p>
          </div>
          {ticket.additionalBenefits && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Also included</p>
              <p>{ticket.additionalBenefits}</p>
            </div>
          )}
          {ticket.conditions && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Conditions</p>
              <p>{ticket.conditions}</p>
            </div>
          )}
          {(ticket.paymentTerms || ticket.deliveryTerms) && (
            <div className="grid grid-cols-2 gap-3">
              {ticket.paymentTerms && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Payment</p>
                  <p>{ticket.paymentTerms}</p>
                </div>
              )}
              {ticket.deliveryTerms && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Delivery</p>
                  <p>{ticket.deliveryTerms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-sm border-t border-border pt-4">
          Present this ticket and reference <strong>{ticket.publicRef}</strong> to{" "}
          <strong>{ticket.businessName}</strong> to complete your purchase.
        </p>

        <p className="text-xs text-ink-muted">
          Issued directly by The Negotiator. {ticket.businessName} already confirmed these exact terms before this
          ticket was issued.
        </p>
      </Card>
    </div>
  )
}
