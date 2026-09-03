import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator } from "@/server/test/factories"
import { addCustomerMessage, addNegotiatorMessage } from "./messages"

describe("addCustomerMessage", () => {
  it("creates a CUSTOMER-authored message and audits it", async () => {
    const negotiationCase = await createCase()

    const message = await addCustomerMessage(negotiationCase.id, "When will I hear back?")

    expect(message.authorType).toBe("CUSTOMER")
    expect(message.authorNegotiatorId).toBeNull()

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "MESSAGE_SENT", relatedEntityId: message.id } })
    expect(audit?.actorType).toBe("CUSTOMER")
    expect(audit?.sourceChannel).toBe("web")
  })
})

describe("addNegotiatorMessage", () => {
  it("creates a NEGOTIATOR-authored message tied to the negotiator", async () => {
    const negotiationCase = await createCase()
    const negotiator = await createNegotiator()

    const message = await addNegotiatorMessage(negotiationCase.id, negotiator.id, "We're checking availability now.")

    expect(message.authorType).toBe("NEGOTIATOR")
    expect(message.authorNegotiatorId).toBe(negotiator.id)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "MESSAGE_SENT", relatedEntityId: message.id } })
    expect(audit?.actorType).toBe("NEGOTIATOR")
    expect(audit?.sourceChannel).toBe("internal")
  })
})
