import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator } from "@/server/test/factories"
import { addInternalNote } from "./notes"

describe("addInternalNote", () => {
  it("creates an internal note distinct from customer-visible messages", async () => {
    const negotiationCase = await createCase()
    const negotiator = await createNegotiator()

    const note = await addInternalNote(negotiationCase.id, negotiator.id, "Customer sounds price-sensitive.")

    expect(note.negotiatorId).toBe(negotiator.id)

    const messages = await testPrisma.message.findMany({ where: { caseId: negotiationCase.id } })
    expect(messages).toHaveLength(0)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "NOTE_ADDED", relatedEntityId: note.id } })
    expect(audit?.relatedEntityType).toBe("InternalNote")
  })
})
