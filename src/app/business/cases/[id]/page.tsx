import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import OfferActions from "@/app/business/cases/[id]/offer-actions"
import InviteActions from "@/app/business/cases/[id]/invite-actions"
import { Card } from "@/components/ui/card"
import StatusBadge from "@/components/status-badge"
import { formatCents } from "@/lib/money"
import { cn } from "@/lib/utils"

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
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{negotiationCase.publicRef}</p>
          <h1 className="text-2xl font-black text-cobalt-600">{negotiationCase.category.name}</h1>
        </div>
        <StatusBadge status={negotiationCase.status} />
      </div>

      <Card className="p-6 space-y-2">
        <p className="text-sm text-ink-muted">Customer requirements</p>
        <p>{negotiationCase.description}</p>
        <div className="text-sm text-ink-soft grid grid-cols-2 gap-1 pt-2">
          {negotiationCase.quantity != null && <p>Quantity: {negotiationCase.quantity}</p>}
          {negotiationCase.location && <p>Location: {negotiationCase.location}</p>}
          {negotiationCase.desiredDate && (
            <p>Desired date: {new Date(negotiationCase.desiredDate).toLocaleDateString()}</p>
          )}
        </div>
      </Card>

      {/* "Action needed" states get an amber accent so they read as
          distinct from passive "waiting on someone else" states. */}
      {isMyCase && latestOffer && (
        <Card className={cn("p-6 space-y-3", !latestOffer.businessConfirmedAt && "border-l-4 border-l-amber-500")}>
          <h2 className="font-bold text-cobalt-600">
            {latestOffer.businessConfirmedAt ? "Confirmed offer" : "Draft offer from your Negotiator"}
          </h2>
          <p className="text-2xl font-black">{formatCents(latestOffer.finalPriceCents, latestOffer.currency)}</p>
          <p className="text-ink-soft">{latestOffer.includedGoods}</p>
          {latestOffer.additionalBenefits && <p className="text-sm text-ink-muted">{latestOffer.additionalBenefits}</p>}
          {latestOffer.conditions && <p className="text-sm text-ink-muted">Conditions: {latestOffer.conditions}</p>}
          {latestOffer.paymentTerms && <p className="text-sm text-ink-muted">Payment: {latestOffer.paymentTerms}</p>}
          {latestOffer.deliveryTerms && <p className="text-sm text-ink-muted">Delivery: {latestOffer.deliveryTerms}</p>}

          {latestOffer.businessConfirmedAt ? (
            <p className="text-sm font-bold text-ink-muted">
              Confirmed by {latestOffer.businessContact?.name ?? "you"} on{" "}
              {new Date(latestOffer.businessConfirmedAt).toLocaleString()}
            </p>
          ) : (
            <OfferActions caseId={negotiationCase.id} offerId={latestOffer.id} />
          )}
        </Card>
      )}

      {isMyCase && !latestOffer && (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">
            No offer drafted yet — your Negotiator will reach out to discuss terms.
          </p>
        </Card>
      )}

      {!isMyCase && myInvite?.status === "PENDING" && (
        <Card className="p-6 space-y-3 border-l-4 border-l-amber-500">
          <h2 className="font-bold text-cobalt-600">Interested in this request?</h2>
          <p className="text-sm text-ink-muted">
            Your Negotiator wants to know if you can fulfill this before discussing terms.
          </p>
          <InviteActions caseId={negotiationCase.id} inviteId={myInvite.id} />
        </Card>
      )}

      {!isMyCase && myInvite?.status === "DECLINED" && (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">You declined this request.</p>
          {myInvite.responseNote && <p className="text-sm text-ink-muted mt-1">&ldquo;{myInvite.responseNote}&rdquo;</p>}
        </Card>
      )}

      {!isMyCase && myInvite?.status === "WITHDRAWN" && (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">This request went to another business.</p>
        </Card>
      )}

      {!isMyCase && myInvite?.status === "ACCEPTED" && (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">
            You accepted this request — your Negotiator will follow up to discuss terms.
          </p>
        </Card>
      )}
    </div>
  )
}
