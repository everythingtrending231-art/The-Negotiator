import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createBusiness, createCase, createCategory, createNegotiator, createOffer, createTicket } from "@/server/test/factories"
import {
  adminForceCloseCase,
  adminReassignCase,
  assignNegotiator,
  createCase as createCaseService,
  escalateCase,
  recordCustomerDecision,
  setCaseStatus,
  unescalateCase,
} from "./cases"

describe("createCase", () => {
  it("creates a case in SUBMITTED status with a ticket, an access token, and a confirmation email", async () => {
    const category = await createCategory()

    const { negotiationCase, ticket } = await createCaseService({
      email: "customer@example.com",
      categoryId: category.id,
      description: "I need a hotel room in Denver.",
    })

    expect(negotiationCase.status).toBe("SUBMITTED")
    expect(negotiationCase.publicRef).toMatch(/^NEG-\d{6}$/)
    expect(ticket.customerEmail).toBe("customer@example.com")

    const tokenCount = await testPrisma.accessToken.count({ where: { ticketId: ticket.id } })
    expect(tokenCount).toBe(1)

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_CREATED" } })
    expect(audit).not.toBeNull()

    const email = await testPrisma.emailLog.findFirst({ where: { template: "ticket-confirmation", to: "customer@example.com" } })
    expect(email).not.toBeNull()
  })

  it("carries through the optional customer-preferred business as a hint, not a binding assignment", async () => {
    const category = await createCategory()
    const business = await createBusiness()

    const { negotiationCase } = await createCaseService({
      email: "customer@example.com",
      categoryId: category.id,
      description: "Looking for a specific hotel.",
      customerPreferredBusinessId: business.id,
    })

    expect(negotiationCase.customerPreferredBusinessId).toBe(business.id)
    // businessId (the binding assignment) is only ever set by createOffer.
    expect(negotiationCase.businessId).toBeNull()
  })
})

describe("assignNegotiator", () => {
  it("moves a SUBMITTED case to ASSIGNED and records who", async () => {
    const negotiationCase = await createCase({ status: "SUBMITTED" })
    const negotiator = await createNegotiator()

    const updated = await assignNegotiator(negotiationCase.id, negotiator.id)

    expect(updated.status).toBe("ASSIGNED")
    expect(updated.assignedNegotiatorId).toBe(negotiator.id)

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_ASSIGNED" } })
    expect(audit).not.toBeNull()
  })

  it("does not change status when the case is already past SUBMITTED/UNDER_REVIEW", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const negotiator = await createNegotiator()

    const updated = await assignNegotiator(negotiationCase.id, negotiator.id)

    expect(updated.status).toBe("NEGOTIATING")
    expect(updated.assignedNegotiatorId).toBe(negotiator.id)
  })
})

describe("setCaseStatus", () => {
  it("moves between non-terminal statuses without touching the ticket or sending a closure email", async () => {
    const negotiationCase = await createCase({ status: "ASSIGNED" })
    const ticket = await createTicket({ negotiationCaseId: negotiationCase.id })
    const negotiator = await createNegotiator()

    await setCaseStatus(negotiationCase.id, "NEGOTIATING", negotiator.id)

    const updatedTicket = await testPrisma.negotiationTicket.findUniqueOrThrow({ where: { id: ticket.id } })
    expect(updatedTicket.status).toBe("ACTIVE")

    const closureEmail = await testPrisma.emailLog.findFirst({ where: { template: "closure-summary" } })
    expect(closureEmail).toBeNull()
  })

  it("closes the ticket, revokes tokens, and sends exactly one closure summary when reaching a terminal status", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const ticket = await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "closure@example.com" })
    const negotiator = await createNegotiator()

    const updated = await setCaseStatus(negotiationCase.id, "CLOSED", negotiator.id)
    expect(updated.status).toBe("CLOSED")

    const updatedTicket = await testPrisma.negotiationTicket.findUniqueOrThrow({ where: { id: ticket.id } })
    expect(updatedTicket.status).toBe("CLOSED")
    expect(updatedTicket.closureSummarySentAt).not.toBeNull()

    const closureEmails = await testPrisma.emailLog.findMany({ where: { template: "closure-summary", to: "closure@example.com" } })
    expect(closureEmails).toHaveLength(1)
  })

  it("issues a feedback token and includes its URL in the closure summary when reaching a terminal status", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ status: "NEGOTIATING", assignedNegotiatorId: negotiator.id })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "feedback-wiring@example.com" })

    await setCaseStatus(negotiationCase.id, "CLOSED", negotiator.id)

    const feedback = await testPrisma.feedback.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })
    expect(feedback.negotiatorId).toBe(negotiator.id)
    expect(feedback.submittedAt).toBeNull()

    const email = await testPrisma.emailLog.findFirstOrThrow({
      where: { template: "closure-summary", to: "feedback-wiring@example.com" },
    })
    const data = email.dataJson as { feedbackUrl?: string }
    expect(data.feedbackUrl).toContain("/feedback/")
  })

  it("sends the offer-ready email exactly once when a case newly reaches OFFER_READY", async () => {
    const negotiationCase = await createCase({ status: "AWAITING_BUSINESS" })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "offer-ready@example.com" })
    const negotiator = await createNegotiator()

    await setCaseStatus(negotiationCase.id, "OFFER_READY", negotiator.id)

    const offerReadyEmails = await testPrisma.emailLog.findMany({ where: { template: "offer-ready", to: "offer-ready@example.com" } })
    expect(offerReadyEmails).toHaveLength(1)
  })
})

describe("escalateCase / unescalateCase", () => {
  it("sets and clears the escalation flag with a reason and audit trail", async () => {
    const negotiationCase = await createCase()
    const negotiator = await createNegotiator()

    const escalated = await escalateCase(negotiationCase.id, "Customer is upset about delay", negotiator.id)
    expect(escalated.escalated).toBe(true)
    expect(escalated.escalatedReason).toBe("Customer is upset about delay")

    const escalatedAudit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_ESCALATED" } })
    expect(escalatedAudit).not.toBeNull()

    const cleared = await unescalateCase(negotiationCase.id, negotiator.id)
    expect(cleared.escalated).toBe(false)
    expect(cleared.escalatedReason).toBeNull()
  })
})

describe("adminReassignCase", () => {
  it("changes the assigned negotiator without touching status", async () => {
    const negotiatorA = await createNegotiator()
    const negotiatorB = await createNegotiator()
    const negotiationCase = await createCase({ status: "NEGOTIATING", assignedNegotiatorId: negotiatorA.id })
    const admin = await testPrisma.user.create({
      data: { email: "admin@example.com", name: "Admin", role: "ADMIN", passwordHash: "x" },
    })

    const updated = await adminReassignCase(negotiationCase.id, negotiatorB.id, admin.id)

    expect(updated.assignedNegotiatorId).toBe(negotiatorB.id)
    expect(updated.status).toBe("NEGOTIATING")
  })
})

describe("adminForceCloseCase", () => {
  it("closes an active case and records the reason", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const admin = await testPrisma.user.create({
      data: { email: "admin2@example.com", name: "Admin", role: "ADMIN", passwordHash: "x" },
    })

    const updated = await adminForceCloseCase(negotiationCase.id, admin.id, "Customer requested cancellation by phone")
    expect(updated.status).toBe("CLOSED")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_FORCE_CLOSED" } })
    expect((audit?.afterJson as { reason?: string } | null)?.reason).toBe("Customer requested cancellation by phone")
  })

  it("refuses to close a case that is already terminal", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const admin = await testPrisma.user.create({
      data: { email: "admin3@example.com", name: "Admin", role: "ADMIN", passwordHash: "x" },
    })

    await expect(adminForceCloseCase(negotiationCase.id, admin.id)).rejects.toThrow("already closed")
  })
})

describe("recordCustomerDecision", () => {
  it("accepts an offer: case -> ACCEPTED, offer -> ACCEPTED", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const updated = await recordCustomerDecision(negotiationCase.id, offer.id, "ACCEPTED")
    expect(updated.status).toBe("ACCEPTED")

    const updatedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(updatedOffer.status).toBe("ACCEPTED")
    expect(updatedOffer.customerDecision).toBe("ACCEPTED")
  })

  it("declines an offer: case -> DECLINED, offer -> DECLINED", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const updated = await recordCustomerDecision(negotiationCase.id, offer.id, "DECLINED")
    expect(updated.status).toBe("DECLINED")
  })

  it("requests another round: case -> NEGOTIATING, offer -> SUPERSEDED", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const updated = await recordCustomerDecision(negotiationCase.id, offer.id, "REQUESTED_ANOTHER_ROUND")
    expect(updated.status).toBe("NEGOTIATING")

    const updatedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(updatedOffer.status).toBe("SUPERSEDED")
  })

  it("rejects a decision on an offer that belongs to a different case", async () => {
    const caseA = await createCase({ status: "OFFER_READY" })
    const caseB = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: caseB.id, status: "PRESENTED" })

    await expect(recordCustomerDecision(caseA.id, offer.id, "ACCEPTED")).rejects.toThrow("does not belong to this case")
  })

  it("rejects a decision on an offer the business hasn't confirmed yet", async () => {
    const negotiationCase = await createCase({ status: "AWAITING_BUSINESS" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PROPOSED" })

    await expect(recordCustomerDecision(negotiationCase.id, offer.id, "ACCEPTED")).rejects.toThrow("not available for a decision")
  })

  it("rejects a decision on an already-closed case", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    await expect(recordCustomerDecision(negotiationCase.id, offer.id, "ACCEPTED")).rejects.toThrow("already closed")
  })
})
