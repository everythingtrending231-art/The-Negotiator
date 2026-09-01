import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import OfferActions from "@/app/business/cases/[id]/offer-actions"
import InviteActions from "@/app/business/cases/[id]/invite-actions"
import { Badge } from "@/components/ui/badge"
import { formatCents } from "@/lib/money"

export default async function BusinessCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  // Data visibility (docs/09): a business never sees the customer's
  // target price/maximum budget, the case's internal notes field, or the
  // customer's email — selected explicitly rather than relying on a
  // blanket include, so nothing sensitive can leak by accident.
  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { id },
    select: {
      id: true,
      publicRef: true,
      status: true,
      businessId: true,
      description: true,
      quantity: true,
      location: true,
      desiredDate: true,
      categoryFieldValues: true,
      category: { select: { name: true, fields: true } },
      offers: {
        orderBy: { createdAt: "desc" },
        include: { businessContact: { select: { name: true } } },
      },
    },
  })

  if (!negotiationCase || negotiationCase.status === "DRAFT") notFound()

  // Ownership/visibility — the case must either already be locked in to
  // this business (an offer exists), or this business must have been
  // invited to it (any status, so past responses stay viewable).
  const myInvite = await prisma.caseBusinessInvite.findUnique({
    where: { caseId_businessId: { caseId: id, businessId: contact.businessId } },
  })
  const isMyCase = negotiationCase.businessId === contact.businessId
  if (!isMyCase && !myInvite) notFound()

  const latestOffer = negotiationCase.offers[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#F5A623" }}>
            {negotiationCase.publicRef}
          </p>
          <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
            {negotiationCase.category.name}
          </h1>
        </div>
        <Badge>{negotiationCase.status}</Badge>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <p className="text-sm text-slate-500">Customer requirements</p>
        <p>{negotiationCase.description}</p>
        <div className="text-sm text-slate-600 grid grid-cols-2 gap-1 pt-2">
          {negotiationCase.quantity != null && <p>Quantity: {negotiationCase.quantity}</p>}
          {negotiationCase.location && <p>Location: {negotiationCase.location}</p>}
          {negotiationCase.desiredDate && (
            <p>Desired date: {new Date(negotiationCase.desiredDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {isMyCase && latestOffer && (
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="font-bold" style={{ color: "#123FA9" }}>
            {latestOffer.businessConfirmedAt ? "Confirmed offer" : "Draft offer from your Negotiator"}
          </h2>
          <p className="text-2xl font-black">{formatCents(latestOffer.finalPriceCents, latestOffer.currency)}</p>
          <p className="text-slate-700">{latestOffer.includedGoods}</p>
          {latestOffer.additionalBenefits && <p className="text-sm text-slate-600">{latestOffer.additionalBenefits}</p>}
          {latestOffer.conditions && <p className="text-sm text-slate-500">Conditions: {latestOffer.conditions}</p>}
          {latestOffer.paymentTerms && <p className="text-sm text-slate-500">Payment: {latestOffer.paymentTerms}</p>}
          {latestOffer.deliveryTerms && <p className="text-sm text-slate-500">Delivery: {latestOffer.deliveryTerms}</p>}

          {latestOffer.businessConfirmedAt ? (
            <p className="text-sm font-bold text-slate-500">
              Confirmed by {latestOffer.businessContact?.name ?? "you"} on{" "}
              {new Date(latestOffer.businessConfirmedAt).toLocaleString()}
            </p>
          ) : (
            <OfferActions caseId={negotiationCase.id} offerId={latestOffer.id} />
          )}
        </div>
      )}

      {isMyCase && !latestOffer && (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">
            No offer drafted yet — your Negotiator will reach out to discuss terms.
          </p>
        </div>
      )}

      {!isMyCase && myInvite?.status === "PENDING" && (
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="font-bold" style={{ color: "#123FA9" }}>
            Interested in this request?
          </h2>
          <p className="text-sm text-slate-500">
            Your Negotiator wants to know if you can fulfill this before discussing terms.
          </p>
          <InviteActions caseId={negotiationCase.id} inviteId={myInvite.id} />
        </div>
      )}

      {!isMyCase && myInvite?.status === "DECLINED" && (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">You declined this request.</p>
          {myInvite.responseNote && <p className="text-sm text-slate-400 mt-1">&ldquo;{myInvite.responseNote}&rdquo;</p>}
        </div>
      )}

      {!isMyCase && myInvite?.status === "WITHDRAWN" && (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">This request went to another business.</p>
        </div>
      )}

      {!isMyCase && myInvite?.status === "ACCEPTED" && (
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">
            You accepted this request — your Negotiator will follow up to discuss terms.
          </p>
        </div>
      )}
    </div>
  )
}
