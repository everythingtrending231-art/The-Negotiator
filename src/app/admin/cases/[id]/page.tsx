import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { requireRole } from "@/server/auth/require-session"
import AdminCaseDetail from "@/app/admin/cases/[id]/admin-case-detail"

// Read shape mirrors the Negotiator case-detail page (context panel, offers,
// messages, notes, audit) but this is Admin oversight: no negotiator-only
// actions (invites, status, add note/message) — just full-override actions
// (reassign, force-close). Offer terms are edited from /admin/offers, not
// here.
export default async function AdminCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireRole(["ADMIN", "SUPER_ADMIN"])

  const [negotiationCase, negotiators] = await Promise.all([
    prisma.negotiationCase.findUnique({
      where: { id },
      include: {
        category: true,
        business: true,
        assignedNegotiator: true,
        ticket: true,
        messages: { orderBy: { createdAt: "asc" }, include: { authorNegotiator: true } },
        internalNotes: { orderBy: { createdAt: "asc" }, include: { negotiator: true } },
        offers: { orderBy: { createdAt: "desc" }, include: { businessContact: true } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 100 },
        feedback: true,
        disputes: { orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "asc" } } } },
        riskFlags: { orderBy: { createdAt: "desc" } },
        dealTicket: { select: { createdAt: true } },
      },
    }),
    prisma.negotiator.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ])

  if (!negotiationCase) notFound()

  return (
    <AdminCaseDetail
      negotiationCase={{
        id: negotiationCase.id,
        publicRef: negotiationCase.publicRef,
        status: negotiationCase.status,
        description: negotiationCase.description,
        attachmentUrls: negotiationCase.attachmentUrls,
        categoryName: negotiationCase.category.name,
        businessName: negotiationCase.business?.name ?? null,
        customerEmail: negotiationCase.ticket?.customerEmail ?? "",
        assignedNegotiatorId: negotiationCase.assignedNegotiatorId,
        assignedNegotiatorName: negotiationCase.assignedNegotiator?.name ?? null,
        escalated: negotiationCase.escalated,
        escalatedReason: negotiationCase.escalatedReason,
      }}
      negotiators={negotiators.map((n) => ({ id: n.id, name: n.name }))}
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
      }))}
      auditLogs={negotiationCase.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        sourceChannel: a.sourceChannel,
        createdAt: a.createdAt.toISOString(),
      }))}
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
      disputes={negotiationCase.disputes.map((d) => ({
        id: d.id,
        status: d.status,
        reason: d.reason,
        raisedByType: d.raisedByType,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        resolvedByType: d.resolvedByType,
        createdAt: d.createdAt.toISOString(),
        notes: d.notes.map((n) => ({
          id: n.id,
          authorType: n.authorType,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        })),
      }))}
      riskFlags={negotiationCase.riskFlags.map((f) => ({
        id: f.id,
        status: f.status,
        reason: f.reason,
        raisedByType: f.raisedByType,
        clearedNote: f.clearedNote,
        clearedAt: f.clearedAt?.toISOString() ?? null,
        clearedByType: f.clearedByType,
        createdAt: f.createdAt.toISOString(),
      }))}
      dealTicketIssuedAt={negotiationCase.dealTicket?.createdAt.toISOString() ?? null}
    />
  )
}
