import { resolveAccessToken } from "@/server/services/tokens"
import CaseDashboard from "@/app/case/[token]/case-dashboard"

export default async function CasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticket = await resolveAccessToken(token)

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black mb-2" style={{ color: "#123FA9" }}>
            This link isn&apos;t active
          </h1>
          <p className="text-slate-600">
            It may have expired, or the case may already be closed. If you still need help, request a fresh link.
          </p>
          <a
            href="/resend"
            className="inline-block mt-6 px-6 py-3 rounded-full font-bold text-white"
            style={{ backgroundColor: "#123FA9" }}
          >
            Get a new link
          </a>
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
            }
          : null
      }
    />
  )
}
