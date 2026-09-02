import { prisma } from "@/server/db"
import AdminOffersList from "@/app/admin/offers/admin-offers-list"

// Offers were previously only ever viewed nested inside a case. This is the
// first cross-case offers view, and the one place Admin can edit offer
// terms directly (the override confirmed in scope) — see adminUpdateOffer
// in src/server/services/offers.ts for what that override can and can't do.
export default async function AdminOffersPage() {
  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { case: { select: { id: true, publicRef: true } }, business: { select: { name: true } } },
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Offers</h1>
      <AdminOffersList
        offers={offers.map((o) => ({
          id: o.id,
          caseId: o.case.id,
          casePublicRef: o.case.publicRef,
          businessName: o.business.name,
          finalPriceCents: o.finalPriceCents,
          originalValueCents: o.originalValueCents,
          currency: o.currency,
          includedGoods: o.includedGoods,
          additionalBenefits: o.additionalBenefits,
          conditions: o.conditions,
          paymentTerms: o.paymentTerms,
          deliveryTerms: o.deliveryTerms,
          validUntil: o.validUntil?.toISOString().slice(0, 10) ?? "",
          status: o.status,
          customerDecision: o.customerDecision,
        }))}
      />
    </div>
  )
}
