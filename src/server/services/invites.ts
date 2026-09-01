import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { applyStatusChangeInTx } from "@/server/services/cases"

// Pre-offer routing (Business Portal request inbox): a Negotiator can
// invite one or several businesses to see a bare request and decide
// whether to engage, before any offer terms exist. Independent of
// NegotiationCase.businessId, which still means "the business we're
// proceeding with" and is only ever set by createOffer.
export async function sendInvites(caseId: string, businessIds: string[], negotiatorId: string) {
  const existingCase = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  const alreadyInvited = await prisma.caseBusinessInvite.findMany({
    where: { caseId, businessId: { in: businessIds } },
    select: { businessId: true },
  })
  const alreadyInvitedIds = new Set(alreadyInvited.map((i) => i.businessId))
  const toInvite = businessIds.filter((id) => !alreadyInvitedIds.has(id))

  const created = await prisma.$transaction(async (tx) => {
    const invites = []
    for (const businessId of toInvite) {
      const invite = await tx.caseBusinessInvite.create({ data: { caseId, businessId } })
      invites.push(invite)
      await recordAudit(tx, {
        actorType: "NEGOTIATOR",
        actorId: negotiatorId,
        caseId,
        action: "INVITE_SENT",
        relatedEntityType: "CaseBusinessInvite",
        relatedEntityId: invite.id,
        after: { businessId },
        sourceChannel: "internal",
      })
    }

    if (invites.length > 0 && existingCase.status === "ASSIGNED") {
      await applyStatusChangeInTx(
        tx,
        existingCase,
        "NEGOTIATING",
        { actorType: "NEGOTIATOR", actorId: negotiatorId },
        "internal",
      )
    }

    return invites
  })

  return { created, skipped: businessIds.length - toInvite.length }
}

export async function respondToInvite(
  inviteId: string,
  businessContactId: string,
  decision: "ACCEPTED" | "DECLINED",
  note?: string,
) {
  const existing = await prisma.caseBusinessInvite.findUniqueOrThrow({ where: { id: inviteId } })
  if (existing.status !== "PENDING") {
    throw new Error("This request has already been responded to.")
  }

  return prisma.$transaction(async (tx) => {
    const invite = await tx.caseBusinessInvite.update({
      where: { id: inviteId },
      data: {
        status: decision,
        respondedByContactId: businessContactId,
        responseNote: note ?? null,
        respondedAt: new Date(),
      },
    })

    await recordAudit(tx, {
      actorType: "BUSINESS",
      actorId: businessContactId,
      caseId: existing.caseId,
      action: decision === "ACCEPTED" ? "INVITE_ACCEPTED" : "INVITE_DECLINED",
      relatedEntityType: "CaseBusinessInvite",
      relatedEntityId: inviteId,
      after: { status: decision, note },
      sourceChannel: "business",
    })

    return invite
  })
}
