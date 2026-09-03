import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { requireRole, getActingNegotiatorId } from "@/server/auth/require-session"
import CaseDetail from "@/app/negotiator/cases/[id]/case-detail"

export default async function NegotiatorCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole(["NEGOTIATOR"])
  const negotiatorId = await getActingNegotiatorId(session)

  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { id },
    include: {
      category: true,
      business: true,
      customerPreferredBusiness: true,
      assignedNegotiator: true,
      ticket: true,
      messages: { orderBy: { createdAt: "asc" }, include: { authorNegotiator: true } },
      internalNotes: { orderBy: { createdAt: "asc" }, include: { negotiator: true } },
      offers: { orderBy: { createdAt: "desc" }, include: { businessContact: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      invites: { orderBy: { createdAt: "desc" }, include: { business: true, respondedByContact: true } },
      feedback: true,
    },
  })

  if (!negotiationCase) notFound()

  // Only published businesses may ever reach a customer's dashboard via an
  // offer (docs/22 §12 acceptance criterion) — this filter was previously
  // missing, so an unpublished business could be picked here.
  const businesses = await prisma.business.findMany({
    where: {
      categories: { some: { categoryId: negotiationCase.categoryId } },
      publishStatus: "PUBLISHED",
    },
    orderBy: { name: "asc" },
  })

  return (
    <CaseDetail
      negotiationCase={{
        id: negotiationCase.id,
        publicRef: negotiationCase.publicRef,
        status: negotiationCase.status,
        description: negotiationCase.description,
        url: negotiationCase.url,
        targetPriceCents: negotiationCase.targetPriceCents,
        maxBudgetCents: negotiationCase.maxBudgetCents,
        currency: negotiationCase.currency,
        quantity: negotiationCase.quantity,
        location: negotiationCase.location,
        notes: negotiationCase.notes,
        categoryName: negotiationCase.category.name,
        businessName: negotiationCase.business?.name ?? null,
        customerPreferredBusinessName: negotiationCase.customerPreferredBusiness?.name ?? null,
        customerEmail: negotiationCase.ticket?.customerEmail ?? "",
        assignedNegotiatorName: negotiationCase.assignedNegotiator?.name ?? null,
        escalated: negotiationCase.escalated,
        escalatedReason: negotiationCase.escalatedReason,
      }}
      messages={negotiationCase.messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorNegotiator?.name ?? null,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      }))}
      notes={negotiationCase.internalNotes.map((n) => ({
        id: n.id,
        negotiatorName: n.negotiator.name,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      }))}
      offers={negotiationCase.offers.map((o) => ({
        id: o.id,
        finalPriceCents: o.finalPriceCents,
        currency: o.currency,
        includedGoods: o.includedGoods,
        status: o.status,
        customerDecision: o.customerDecision,
        createdAt: o.createdAt.toISOString(),
        businessConfirmedAt: o.businessConfirmedAt?.toISOString() ?? null,
        businessContactName: o.businessContact?.name ?? null,
        businessFeedback: o.businessFeedback,
      }))}
      auditLogs={negotiationCase.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        sourceChannel: a.sourceChannel,
        createdAt: a.createdAt.toISOString(),
      }))}
      invites={negotiationCase.invites.map((i) => ({
        id: i.id,
        businessId: i.businessId,
        businessName: i.business.name,
        status: i.status,
        responseNote: i.responseNote,
        respondedByName: i.respondedByContact?.name ?? null,
        respondedAt: i.respondedAt?.toISOString() ?? null,
      }))}
      currentNegotiator={{ id: negotiatorId, name: session.name }}
      businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
      feedback={
        negotiationCase.feedback
          ? {
              submittedAt: negotiationCase.feedback.submittedAt?.toISOString() ?? null,
              savedMoney: negotiationCase.feedback.savedMoney,
              improvedDeal: negotiationCase.feedback.improvedDeal,
              negotiatorRating: negotiationCase.feedback.negotiatorRating,
              wouldUseAgain: negotiationCase.feedback.wouldUseAgain,
            }
          : null
      }
    />
  )
}
