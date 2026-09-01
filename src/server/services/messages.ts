import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

export async function addCustomerMessage(caseId: string, body: string) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: { caseId, authorType: "CUSTOMER", body } })
    await recordAudit(tx, {
      actorType: "CUSTOMER",
      caseId,
      action: "MESSAGE_SENT",
      relatedEntityType: "Message",
      relatedEntityId: message.id,
      sourceChannel: "web",
    })
    return message
  })
}

export async function addNegotiatorMessage(caseId: string, negotiatorId: string, body: string) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { caseId, authorType: "NEGOTIATOR", authorNegotiatorId: negotiatorId, body },
    })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: negotiatorId,
      caseId,
      action: "MESSAGE_SENT",
      relatedEntityType: "Message",
      relatedEntityId: message.id,
      sourceChannel: "internal",
    })
    return message
  })
}
