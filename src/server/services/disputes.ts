import type { ActorType } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { applyStatusChangeInTx } from "@/server/services/cases"

export type StaffActor = { actorType: Extract<ActorType, "NEGOTIATOR" | "ADMIN">; actorId: string }

// Intake (docs/13 §9): opens a formal dispute record and moves the case
// into CaseStatus.DISPUTED via the same status-change machinery every
// other transition uses. DISPUTED is non-terminal (see isTerminal's
// comment in cases.ts), so this doesn't touch the ticket or send a
// closure email — the case stays open and workable while a dispute is in
// progress.
export async function openDispute(caseId: string, reason: string, actor: StaffActor) {
  const negotiationCase = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })

  const existingOpen = await prisma.dispute.findFirst({ where: { caseId, status: "OPEN" } })
  if (existingOpen) {
    throw new Error("This case already has an open dispute.")
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        caseId,
        reason,
        raisedByType: actor.actorType,
        raisedById: actor.actorId,
      },
    })

    await applyStatusChangeInTx(
      tx,
      negotiationCase,
      "DISPUTED",
      { actorType: actor.actorType, actorId: actor.actorId },
      "internal",
    )

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      caseId,
      action: "DISPUTE_OPENED",
      relatedEntityType: "Dispute",
      relatedEntityId: created.id,
      after: { reason },
      sourceChannel: "internal",
    })

    return created
  })
}

// Evidence collection / Review / Communication (docs/13 §9): a running
// trail of notes on an open dispute, same shape as InternalNote.
export async function addDisputeNote(disputeId: string, body: string, actor: StaffActor) {
  const dispute = await prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } })

  return prisma.$transaction(async (tx) => {
    const note = await tx.disputeNote.create({
      data: { disputeId, authorType: actor.actorType, authorId: actor.actorId, body },
    })

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      caseId: dispute.caseId,
      action: "DISPUTE_NOTE_ADDED",
      relatedEntityType: "Dispute",
      relatedEntityId: disputeId,
      after: { body },
      sourceChannel: "internal",
    })

    return note
  })
}

// Resolution / Closure (docs/13 §9): records the outcome. Deliberately
// does not change NegotiationCase.status itself — the docs don't specify
// what a case should return to after a dispute (back to NEGOTIATING?
// straight to CLOSED? depends entirely on what was disputed), so that
// stays a manual staff decision via the case's existing status control.
export async function resolveDispute(disputeId: string, resolution: string, actor: StaffActor) {
  const dispute = await prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } })
  if (dispute.status !== "OPEN") {
    throw new Error("This dispute has already been resolved.")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution,
        resolvedAt: new Date(),
        resolvedByType: actor.actorType,
        resolvedById: actor.actorId,
      },
    })

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      caseId: dispute.caseId,
      action: "DISPUTE_RESOLVED",
      relatedEntityType: "Dispute",
      relatedEntityId: disputeId,
      after: { resolution },
      sourceChannel: "internal",
    })

    return updated
  })
}

export async function listDisputesForCase(caseId: string) {
  return prisma.dispute.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  })
}
