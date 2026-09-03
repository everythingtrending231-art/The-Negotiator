import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator, createUser } from "@/server/test/factories"
import {
  clearRiskFlag,
  listRiskFlagsForCase,
  listRiskFlagsForCustomer,
  raiseCaseRiskFlag,
  raiseCustomerRiskFlag,
} from "./risk-flags"

describe("raiseCaseRiskFlag", () => {
  it("creates an open flag on a case and records an audit row", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })

    const flag = await raiseCaseRiskFlag(negotiationCase.id, "Payment details look inconsistent", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    expect(flag.status).toBe("OPEN")
    expect(flag.caseId).toBe(negotiationCase.id)
    expect(flag.raisedByType).toBe("NEGOTIATOR")
    expect(flag.raisedById).toBe(negotiator.id)

    const audit = await testPrisma.auditLog.findFirst({
      where: { caseId: negotiationCase.id, action: "RISK_FLAG_RAISED" },
    })
    expect(audit).not.toBeNull()

    const flags = await listRiskFlagsForCase(negotiationCase.id)
    expect(flags).toHaveLength(1)
  })

  it("refuses to raise a second flag while one is already open on the same case", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })

    await raiseCaseRiskFlag(negotiationCase.id, "First concern", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    await expect(
      raiseCaseRiskFlag(negotiationCase.id, "Second concern", { actorType: "NEGOTIATOR", actorId: negotiator.id }),
    ).rejects.toThrow("already has an open risk flag")
  })

  it("allows an admin to raise a flag using their own actor id", async () => {
    const admin = await createUser({ role: "ADMIN" })
    const negotiationCase = await createCase()

    const flag = await raiseCaseRiskFlag(negotiationCase.id, "Escalated by support", {
      actorType: "ADMIN",
      actorId: admin.id,
    })

    expect(flag.raisedByType).toBe("ADMIN")
    expect(flag.raisedById).toBe(admin.id)
  })
})

describe("raiseCustomerRiskFlag", () => {
  it("creates an open flag scoped to a lowercased customer email", async () => {
    const admin = await createUser({ role: "ADMIN" })

    const flag = await raiseCustomerRiskFlag("Suspicious@Example.com", "Multiple chargebacks reported", {
      actorType: "ADMIN",
      actorId: admin.id,
    })

    expect(flag.status).toBe("OPEN")
    expect(flag.caseId).toBeNull()
    expect(flag.customerEmail).toBe("suspicious@example.com")

    const flags = await listRiskFlagsForCustomer("SUSPICIOUS@example.com")
    expect(flags).toHaveLength(1)
  })

  it("refuses to raise a second flag while one is already open on the same customer", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await raiseCustomerRiskFlag("repeat@example.com", "First concern", { actorType: "ADMIN", actorId: admin.id })

    await expect(
      raiseCustomerRiskFlag("repeat@example.com", "Second concern", { actorType: "ADMIN", actorId: admin.id }),
    ).rejects.toThrow("already has an open risk flag")
  })
})

describe("clearRiskFlag", () => {
  it("marks a flag cleared with a note and clearer, without touching case status", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id, status: "NEGOTIATING" })
    const flag = await raiseCaseRiskFlag(negotiationCase.id, "Reason", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    const cleared = await clearRiskFlag(flag.id, "Verified with the customer directly; false alarm", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    expect(cleared.status).toBe("CLEARED")
    expect(cleared.clearedNote).toBe("Verified with the customer directly; false alarm")
    expect(cleared.clearedByType).toBe("NEGOTIATOR")
    expect(cleared.clearedById).toBe(negotiator.id)
    expect(cleared.clearedAt).not.toBeNull()

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("NEGOTIATING")
  })

  it("refuses to clear a flag that's already cleared", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const flag = await raiseCaseRiskFlag(negotiationCase.id, "Reason", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })
    await clearRiskFlag(flag.id, "Cleared once", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    await expect(
      clearRiskFlag(flag.id, "Cleared twice", { actorType: "NEGOTIATOR", actorId: negotiator.id }),
    ).rejects.toThrow("already been cleared")
  })

  it("allows raising a new flag on the same subject once the prior one is cleared", async () => {
    const admin = await createUser({ role: "ADMIN" })
    const first = await raiseCustomerRiskFlag("cycle@example.com", "First concern", {
      actorType: "ADMIN",
      actorId: admin.id,
    })
    await clearRiskFlag(first.id, "Resolved", { actorType: "ADMIN", actorId: admin.id })

    const second = await raiseCustomerRiskFlag("cycle@example.com", "New concern", {
      actorType: "ADMIN",
      actorId: admin.id,
    })

    expect(second.status).toBe("OPEN")
    const flags = await listRiskFlagsForCustomer("cycle@example.com")
    expect(flags).toHaveLength(2)
  })
})
