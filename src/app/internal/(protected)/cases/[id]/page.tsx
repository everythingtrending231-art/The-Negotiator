import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import CaseDetail from "@/app/internal/(protected)/cases/[id]/case-detail"

export default async function InternalCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { id },
    include: {
      category: true,
      business: true,
      assignedNegotiator: true,
      ticket: true,
      messages: { orderBy: { createdAt: "asc" }, include: { authorNegotiator: true } },
      internalNotes: { orderBy: { createdAt: "asc" }, include: { negotiator: true } },
      offers: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  })

  if (!negotiationCase) notFound()

  const [negotiators, businesses] = await Promise.all([
    prisma.negotiator.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.business.findMany({
      where: { categories: { some: { categoryId: negotiationCase.categoryId } } },
      orderBy: { name: "asc" },
    }),
  ])

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
        customerEmail: negotiationCase.ticket?.customerEmail ?? "",
        assignedNegotiatorId: negotiationCase.assignedNegotiatorId,
        assignedNegotiatorName: negotiationCase.assignedNegotiator?.name ?? null,
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
      }))}
      auditLogs={negotiationCase.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        sourceChannel: a.sourceChannel,
        createdAt: a.createdAt.toISOString(),
      }))}
      negotiators={negotiators.map((n) => ({ id: n.id, name: n.name }))}
      businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
    />
  )
}
