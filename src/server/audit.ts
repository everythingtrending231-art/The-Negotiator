import type { ActorType, Prisma } from "@prisma/client"

export type AuditInput = {
  actorType: ActorType
  actorId?: string | null
  caseId?: string | null
  action: string
  before?: unknown
  after?: unknown
  relatedEntityType?: string
  relatedEntityId?: string
  sourceChannel: string
}

// Every material action (docs/08_PLATFORM_ARCHITECTURE.md §6) writes through
// here, inside the same transaction as the mutation it documents, so a
// write and its audit row always succeed or fail together.
export async function recordAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      caseId: input.caseId ?? null,
      action: input.action,
      beforeJson: input.before === undefined ? undefined : (input.before as Prisma.InputJsonValue),
      afterJson: input.after === undefined ? undefined : (input.after as Prisma.InputJsonValue),
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      sourceChannel: input.sourceChannel,
    },
  })
}
