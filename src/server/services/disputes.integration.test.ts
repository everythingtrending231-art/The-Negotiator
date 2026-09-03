import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator, createUser } from "@/server/test/factories"
import { addDisputeNote, listDisputesForCase, openDispute, resolveDispute } from "./disputes"

describe("openDispute", () => {
  it("creates a dispute, moves the case to DISPUTED, and records an audit row", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ status: "NEGOTIATING", assignedNegotiatorId: negotiator.id })

    const dispute = await openDispute(negotiationCase.id, "Customer says the item was never delivered", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    expect(dispute.status).toBe("OPEN")
    expect(dispute.raisedByType).toBe("NEGOTIATOR")
    expect(dispute.raisedById).toBe(negotiator.id)

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("DISPUTED")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "DISPUTE_OPENED" } })
    expect(audit).not.toBeNull()
  })

  it("refuses to open a second dispute while one is already open on the same case", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })

    await openDispute(negotiationCase.id, "First issue", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    await expect(
      openDispute(negotiationCase.id, "Second issue", { actorType: "NEGOTIATOR", actorId: negotiator.id }),
    ).rejects.toThrow("already has an open dispute")
  })

  it("allows an admin to open a dispute using their own actor id", async () => {
    const admin = await createUser({ role: "ADMIN" })
    const negotiationCase = await createCase()

    const dispute = await openDispute(negotiationCase.id, "Escalated by support", {
      actorType: "ADMIN",
      actorId: admin.id,
    })

    expect(dispute.raisedByType).toBe("ADMIN")
    expect(dispute.raisedById).toBe(admin.id)
  })
})

describe("addDisputeNote", () => {
  it("appends a note and records an audit row scoped to the dispute's case", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const dispute = await openDispute(negotiationCase.id, "Reason", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    const note = await addDisputeNote(dispute.id, "Contacted the customer for evidence photos", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    expect(note.body).toBe("Contacted the customer for evidence photos")

    const disputes = await listDisputesForCase(negotiationCase.id)
    expect(disputes[0].notes).toHaveLength(1)

    const audit = await testPrisma.auditLog.findFirst({
      where: { caseId: negotiationCase.id, action: "DISPUTE_NOTE_ADDED" },
    })
    expect(audit).not.toBeNull()
  })
})

describe("resolveDispute", () => {
  it("marks the dispute resolved with a resolution and resolver, without touching case status", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const dispute = await openDispute(negotiationCase.id, "Reason", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    const resolved = await resolveDispute(dispute.id, "Refund issued; customer confirmed satisfied", {
      actorType: "NEGOTIATOR",
      actorId: negotiator.id,
    })

    expect(resolved.status).toBe("RESOLVED")
    expect(resolved.resolution).toBe("Refund issued; customer confirmed satisfied")
    expect(resolved.resolvedByType).toBe("NEGOTIATOR")
    expect(resolved.resolvedById).toBe(negotiator.id)
    expect(resolved.resolvedAt).not.toBeNull()

    // Case status is a separate, manual staff decision (see disputes.ts) —
    // resolving the dispute alone shouldn't move it.
    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("DISPUTED")
  })

  it("refuses to resolve a dispute that's already resolved", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const dispute = await openDispute(negotiationCase.id, "Reason", { actorType: "NEGOTIATOR", actorId: negotiator.id })
    await resolveDispute(dispute.id, "Resolved once", { actorType: "NEGOTIATOR", actorId: negotiator.id })

    await expect(
      resolveDispute(dispute.id, "Resolved twice", { actorType: "NEGOTIATOR", actorId: negotiator.id }),
    ).rejects.toThrow("already been resolved")
  })
})
