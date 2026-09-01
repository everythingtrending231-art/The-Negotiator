import { resolveAccessToken } from "@/server/services/tokens"
import CaseDashboard from "@/app/case/[token]/case-dashboard"
import SiteHeader from "@/components/site-header"
import NegotiatorMark from "@/components/negotiator-mark"

export default async function CasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticket = await resolveAccessToken(token)

  if (!ticket) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-16">
          <div className="max-w-sm text-center bg-white rounded-panel shadow-panel p-10 animate-scale-in">
            <div className="mx-auto mb-6 flex items-center justify-center opacity-90">
              <NegotiatorMark size={64} />
            </div>
            <h1 className="font-black text-display-sm text-cobalt-600 mb-3">This link isn&apos;t active</h1>
            <p className="text-ink-muted leading-relaxed">
              It may have expired, or this negotiation may already be closed — if so, we&apos;ve already emailed
              you the details. If you still need help, request a fresh link.
            </p>
            <a
              href="/resend"
              className="inline-flex mt-7 px-6 py-3.5 rounded-pill font-bold text-white bg-cobalt-600 shadow-card transition-all duration-200 ease-confident hover:shadow-card-lift hover:-translate-y-0.5"
            >
              Get a new link
            </a>
          </div>
        </div>
      </div>
    )
  }

  const negotiationCase = ticket.negotiationCase
  // Phase 2 Stage 2: an offer only becomes customer-visible once the
  // business has confirmed it (status PROPOSED -> PRESENTED) — a
  // Negotiator-drafted PROPOSED offer must never reach the customer.
  const latestOffer = negotiationCase.offers.find((offer) => offer.status !== "PROPOSED")

  return (
    <CaseDashboard
      token={token}
      caseRef={negotiationCase.publicRef}
      status={negotiationCase.status}
      negotiatorName={negotiationCase.assignedNegotiator?.name ?? null}
      estimatedNextUpdateAt={negotiationCase.estimatedNextUpdateAt?.toISOString() ?? null}
      messages={negotiationCase.messages.map((message) => ({
        id: message.id,
        authorType: message.authorType,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      }))}
      offer={
        latestOffer
          ? {
              id: latestOffer.id,
              finalPriceCents: latestOffer.finalPriceCents,
              currency: latestOffer.currency,
              includedGoods: latestOffer.includedGoods,
              additionalBenefits: latestOffer.additionalBenefits,
              conditions: latestOffer.conditions,
              paymentTerms: latestOffer.paymentTerms,
              deliveryTerms: latestOffer.deliveryTerms,
              validUntil: latestOffer.validUntil?.toISOString() ?? null,
              status: latestOffer.status,
              customerDecision: latestOffer.customerDecision,
              businessName: negotiationCase.business?.name ?? null,
            }
          : null
      }
    />
  )
}
