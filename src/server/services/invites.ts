import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { applyStatusChangeInTx } from "@/server/services/cases"
import { sendEmail } from "@/server/email/send"
import { buildBusinessCaseUrl, buildNegotiatorCaseUrl } from "@/server/urls"

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

  if (created.length > 0) {
    const contacts = await prisma.businessContact.findMany({
      where: { businessId: { in: created.map((invite) => invite.businessId) }, userId: { not: null } },
      include: { user: { select: { email: true } } },
    })
    const portalUrl = buildBusinessCaseUrl(caseId)
    for (const contact of contacts) {
      if (!contact.user) continue
      await sendEmail({
        to: contact.user.email,
        template: "invite-received",
        data: { caseRef: existingCase.publicRef, portalUrl },
      })
    }
  }

  return { created, skipped: businessIds.length - toInvite.length }
}

export async function respondToInvite(
  inviteId: string,
  businessContactId: string,
  decision: "ACCEPTED" | "DECLINED",
  note?: string,
) {
  const existing = await prisma.caseBusinessInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: {
      business: { select: { name: true } },
      case: { include: { assignedNegotiator: { include: { user: { select: { email: true } } } } } },
    },
  })
  if (existing.status !== "PENDING") {
    throw new Error("This request has already been responded to.")
  }

  const invite = await prisma.$transaction(async (tx) => {
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

  const negotiatorEmail = existing.case.assignedNegotiator?.user?.email
  if (negotiatorEmail) {
    const portalUrl = buildNegotiatorCaseUrl(existing.caseId)
    if (decision === "ACCEPTED") {
      await sendEmail({
        to: negotiatorEmail,
        template: "invite-accepted",
        data: { caseRef: existing.case.publicRef, businessName: existing.business.name, portalUrl },
      })
    } else {
      await sendEmail({
        to: negotiatorEmail,
        template: "invite-declined",
        data: { caseRef: existing.case.publicRef, businessName: existing.business.name, note: note ?? null, portalUrl },
      })
    }
  }

  return invite
}
