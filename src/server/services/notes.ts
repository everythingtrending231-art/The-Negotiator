import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

// InternalNote is a distinct model from Message (see prisma/schema.prisma)
// so "never customer-visible" can't leak via a wrong default — every
// customer-facing read path queries Message, never InternalNote.
export async function addInternalNote(caseId: string, negotiatorId: string, body: string) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.internalNote.create({ data: { caseId, negotiatorId, body } })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: negotiatorId,
      caseId,
      action: "NOTE_ADDED",
      relatedEntityType: "InternalNote",
      relatedEntityId: note.id,
      sourceChannel: "internal",
    })
    return note
  })
}
