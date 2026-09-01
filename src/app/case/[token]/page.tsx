import { resolveAccessToken } from "@/server/services/tokens"
import CaseDashboard from "@/app/case/[token]/case-dashboard"
import SiteHeader from "@/components/site-header"
import ExpiredLinkCard from "@/app/case/[token]/expired-link-card"

export default async function CasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticket = await resolveAccessToken(token)

  if (!ticket) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-16">
          <ExpiredLinkCard />
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
