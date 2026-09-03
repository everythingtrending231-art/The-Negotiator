import { buildTicketUrl, resolveDealTicket } from "@/server/services/deal-tickets"
import { generateTicketQrCodeDataUrl } from "@/server/services/deal-ticket-qr"
import SiteHeader from "@/components/site-header"
import DealTicketStateCard from "@/app/deal/[token]/deal-ticket-state-card"
import DealTicketView from "@/app/deal/[token]/deal-ticket-view"

export default async function DealTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticket = await resolveDealTicket(token)

  if (!ticket) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-16">
          <DealTicketStateCard
            title="This link isn't valid"
            body="It may be mistyped, or this isn't a deal ticket link we recognize."
          />
        </div>
      </div>
    )
  }

  const qrCodeDataUrl = await generateTicketQrCodeDataUrl(buildTicketUrl(token))

  return (
    <div className="min-h-screen bg-cream">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <DealTicketView
        ticket={{
          publicRef: ticket.case.publicRef,
          businessName: ticket.businessName,
          categoryName: ticket.categoryName,
          finalPriceCents: ticket.finalPriceCents,
          currency: ticket.currency,
          includedGoods: ticket.includedGoods,
          additionalBenefits: ticket.additionalBenefits,
          conditions: ticket.conditions,
          paymentTerms: ticket.paymentTerms,
          deliveryTerms: ticket.deliveryTerms,
          validUntil: ticket.validUntil?.toISOString() ?? null,
          createdAt: ticket.createdAt.toISOString(),
        }}
        qrCodeDataUrl={qrCodeDataUrl}
      />
    </div>
  )
}
