import type { ActorType } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

export type StaffActor = { actorType: Extract<ActorType, "NEGOTIATOR" | "ADMIN">; actorId: string }

// docs/02 §6 "Fraud/risk flags" — manual, staff-raised (see RiskFlag's
// schema comment for why this isn't automated). A case can carry a flag
// raised by whichever staff member is working it; only one open flag per
// subject at a time, mirroring disputes.ts's same one-open-at-a-time rule.
export async function raiseCaseRiskFlag(caseId: string, reason: string, actor: StaffActor) {
  const existingOpen = await prisma.riskFlag.findFirst({ where: { caseId, status: "OPEN" } })
  if (existingOpen) {
    throw new Error("This case already has an open risk flag.")
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.riskFlag.create({
      data: { caseId, reason, raisedByType: actor.actorType, raisedById: actor.actorId },
    })

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      caseId,
      action: "RISK_FLAG_RAISED",
      relatedEntityType: "RiskFlag",
      relatedEntityId: created.id,
      after: { reason },
      sourceChannel: "internal",
    })

    return created
  })
}

// Customer-email flags are Admin-only — this is the fraud/support
// investigation entry point on /admin/customers, which has no Negotiator
// equivalent (customer identity is ticket-based, not a Negotiator-facing
// directory).
export async function raiseCustomerRiskFlag(email: string, reason: string, actor: { actorType: "ADMIN"; actorId: string }) {
  const customerEmail = email.trim().toLowerCase()
  const existingOpen = await prisma.riskFlag.findFirst({ where: { customerEmail, status: "OPEN" } })
  if (existingOpen) {
    throw new Error("This customer already has an open risk flag.")
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.riskFlag.create({
      data: { customerEmail, reason, raisedByType: actor.actorType, raisedById: actor.actorId },
    })

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "RISK_FLAG_RAISED",
      relatedEntityType: "RiskFlag",
      relatedEntityId: created.id,
      after: { reason, customerEmail },
      sourceChannel: "internal",
    })

    return created
  })
}

export async function clearRiskFlag(id: string, note: string, actor: StaffActor) {
  const flag = await prisma.riskFlag.findUniqueOrThrow({ where: { id } })
  if (flag.status !== "OPEN") {
    throw new Error("This risk flag has already been cleared.")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.riskFlag.update({
      where: { id },
      data: {
        status: "CLEARED",
        clearedNote: note,
        clearedAt: new Date(),
        clearedByType: actor.actorType,
        clearedById: actor.actorId,
      },
    })

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      caseId: flag.caseId ?? undefined,
      action: "RISK_FLAG_CLEARED",
      relatedEntityType: "RiskFlag",
      relatedEntityId: id,
      after: { note },
      sourceChannel: "internal",
    })

    return updated
  })
}

export async function listRiskFlagsForCase(caseId: string) {
  return prisma.riskFlag.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } })
}

export async function listRiskFlagsForCustomer(email: string) {
  return prisma.riskFlag.findMany({
    where: { customerEmail: email.trim().toLowerCase() },
    orderBy: { createdAt: "desc" },
  })
}
