import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import {
  createBusiness,
  createCase,
  createCategory,
  createNegotiator,
  createOffer,
  createTicket,
  createUser,
} from "@/server/test/factories"
import {
  adminForceCloseCase,
  adminReassignCase,
  assignNegotiator,
  cancelCase,
  createCase as createCaseService,
  escalateCase,
  expireOfferIfPastDue,
  recordCustomerDecision,
  resendClosureRecord,
  setCaseStatus,
  unescalateCase,
  withdrawCase,
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

  it("stores customer-uploaded attachment URLs, defaulting to an empty array when none are given", async () => {
    const category = await createCategory()

    const { negotiationCase: withAttachments } = await createCaseService({
      email: "customer@example.com",
      categoryId: category.id,
      description: "I need a hotel room in Denver.",
      attachmentUrls: ["https://example.public.blob.vercel-storage.com/request-attachments/a.jpg"],
    })
    expect(withAttachments.attachmentUrls).toEqual([
      "https://example.public.blob.vercel-storage.com/request-attachments/a.jpg",
    ])

    const { negotiationCase: withoutAttachments } = await createCaseService({
      email: "customer@example.com",
      categoryId: category.id,
      description: "I need a hotel room in Denver.",
    })
    expect(withoutAttachments.attachmentUrls).toEqual([])
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

  it("refuses to change the status of an already-terminal case", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const negotiator = await createNegotiator()

    await expect(setCaseStatus(negotiationCase.id, "NEGOTIATING", negotiator.id)).rejects.toThrow("already closed")
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

describe("cancelCase", () => {
  it("cancels an active case and records the reason", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const negotiator = await createNegotiator()

    const updated = await cancelCase(
      negotiationCase.id,
      { actorType: "NEGOTIATOR", actorId: negotiator.id },
      "Customer unreachable after repeated attempts",
    )
    expect(updated.status).toBe("CANCELLED")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_CANCELLED" } })
    expect((audit?.afterJson as { reason?: string } | null)?.reason).toBe("Customer unreachable after repeated attempts")
  })

  it("rejects an empty reason", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const admin = await createUser({ role: "ADMIN" })

    await expect(
      cancelCase(negotiationCase.id, { actorType: "ADMIN", actorId: admin.id }, "   "),
    ).rejects.toThrow("reason is required")
  })

  it("refuses to cancel a case that is already terminal", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const admin = await createUser({ role: "ADMIN" })

    await expect(
      cancelCase(negotiationCase.id, { actorType: "ADMIN", actorId: admin.id }, "Duplicate request"),
    ).rejects.toThrow("already closed")
  })
})

describe("recordCustomerDecision", () => {
  it("accepts an offer: case -> ACCEPTED, offer -> ACCEPTED, and issues a deal ticket", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const { negotiationCase: updated, dealTicketUrl } = await recordCustomerDecision(
      negotiationCase.id,
      offer.id,
      "ACCEPTED",
    )
    expect(updated.status).toBe("ACCEPTED")
    expect(dealTicketUrl).toContain("/deal/")

    const updatedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(updatedOffer.status).toBe("ACCEPTED")
    expect(updatedOffer.customerDecision).toBe("ACCEPTED")

    const ticket = await testPrisma.dealTicket.findUnique({ where: { caseId: negotiationCase.id } })
    expect(ticket).not.toBeNull()
    expect(ticket?.finalPriceCents).toBe(offer.finalPriceCents)
  })

  it("declines an offer: case -> DECLINED, offer -> DECLINED, no deal ticket", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const { negotiationCase: updated, dealTicketUrl } = await recordCustomerDecision(
      negotiationCase.id,
      offer.id,
      "DECLINED",
    )
    expect(updated.status).toBe("DECLINED")
    expect(dealTicketUrl).toBeNull()

    const ticket = await testPrisma.dealTicket.findUnique({ where: { caseId: negotiationCase.id } })
    expect(ticket).toBeNull()
  })

  it("does not present a declined offer's terms as 'final' in the closure summary email", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "declined-terms@example.com" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    await recordCustomerDecision(negotiationCase.id, offer.id, "DECLINED")

    const email = await testPrisma.emailLog.findFirstOrThrow({
      where: { template: "closure-summary", to: "declined-terms@example.com" },
    })
    const data = email.dataJson as { offerSummary?: unknown }
    expect(data.offerSummary).toBeNull()
  })

  it("requests another round: case -> NEGOTIATING, offer -> SUPERSEDED, no deal ticket", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const { negotiationCase: updated, dealTicketUrl } = await recordCustomerDecision(
      negotiationCase.id,
      offer.id,
      "REQUESTED_ANOTHER_ROUND",
    )
    expect(updated.status).toBe("NEGOTIATING")
    expect(dealTicketUrl).toBeNull()

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

  it("rejects a decision on an offer past its validUntil, expiring the case instead", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { validUntil: new Date(Date.now() - 1000) } })

    await expect(recordCustomerDecision(negotiationCase.id, offer.id, "ACCEPTED")).rejects.toThrow("expired")

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("EXPIRED")
    const updatedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(updatedOffer.status).toBe("EXPIRED")
  })
})

describe("expireOfferIfPastDue", () => {
  it("expires a case whose presented offer is past validUntil, revoking tokens and sending a closure email", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "expiry-test@example.com" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { validUntil: new Date(Date.now() - 1000) } })

    const updated = await expireOfferIfPastDue(negotiationCase.id)
    expect(updated.status).toBe("EXPIRED")

    const updatedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(updatedOffer.status).toBe("EXPIRED")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "OFFER_EXPIRED" } })
    expect(audit).not.toBeNull()

    const email = await testPrisma.emailLog.findFirst({ where: { template: "closure-summary", to: "expiry-test@example.com" } })
    expect(email).not.toBeNull()
  })

  it("leaves an offer with no validUntil untouched", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })

    const updated = await expireOfferIfPastDue(negotiationCase.id)
    expect(updated.status).toBe("OFFER_READY")

    const unchangedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(unchangedOffer.status).toBe("PRESENTED")
  })

  it("leaves an offer that hasn't expired yet untouched", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { validUntil: new Date(Date.now() + 60_000) } })

    const updated = await expireOfferIfPastDue(negotiationCase.id)
    expect(updated.status).toBe("OFFER_READY")
  })

  it("is a no-op on an already-terminal case", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { validUntil: new Date(Date.now() - 1000) } })

    const updated = await expireOfferIfPastDue(negotiationCase.id)
    expect(updated.status).toBe("CLOSED")

    const unchangedOffer = await testPrisma.offer.findUniqueOrThrow({ where: { id: offer.id } })
    expect(unchangedOffer.status).toBe("PRESENTED")
  })
})

describe("resendClosureRecord", () => {
  it("resends the closure summary and reissues the deal ticket, recording an audit row", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "resend-test@example.com" })
    const offer = await createOffer({ caseId: negotiationCase.id, status: "PRESENTED" })
    const admin = await createUser({ role: "ADMIN" })

    await recordCustomerDecision(negotiationCase.id, offer.id, "ACCEPTED")

    const emailsBefore = await testPrisma.emailLog.count({
      where: { template: "closure-summary", to: "resend-test@example.com" },
    })
    expect(emailsBefore).toBe(1)

    const dealTicketBefore = await testPrisma.dealTicket.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })

    await resendClosureRecord(negotiationCase.id, admin.id, "Verified caller via phone, matched name and email on file.")

    const emailsAfter = await testPrisma.emailLog.count({
      where: { template: "closure-summary", to: "resend-test@example.com" },
    })
    expect(emailsAfter).toBe(2)

    // Reissued, not the same token — the original raw value was never
    // persisted, so a resend has to mint a fresh one.
    const dealTicketAfter = await testPrisma.dealTicket.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })
    expect(dealTicketAfter.tokenHash).not.toBe(dealTicketBefore.tokenHash)

    const audit = await testPrisma.auditLog.findFirst({
      where: { caseId: negotiationCase.id, action: "POST_CLOSURE_RECORD_RESENT" },
    })
    expect(audit).not.toBeNull()
    expect((audit?.afterJson as { verificationNote?: string })?.verificationNote).toContain("Verified caller")
  })

  it("rejects an empty verification note", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    await createTicket({ negotiationCaseId: negotiationCase.id })
    const admin = await createUser({ role: "ADMIN" })

    await expect(resendClosureRecord(negotiationCase.id, admin.id, "   ")).rejects.toThrow("verification note is required")
  })

  it("rejects a case that hasn't closed yet", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    await createTicket({ negotiationCaseId: negotiationCase.id })
    const admin = await createUser({ role: "ADMIN" })

    await expect(
      resendClosureRecord(negotiationCase.id, admin.id, "Verified via phone."),
    ).rejects.toThrow("hasn't closed yet")
  })

  it("rejects a case with no customer ticket", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    const admin = await createUser({ role: "ADMIN" })

    await expect(
      resendClosureRecord(negotiationCase.id, admin.id, "Verified via phone."),
    ).rejects.toThrow("no customer ticket")
  })
})

describe("withdrawCase", () => {
  it("withdraws a pre-offer case and sends a confirmation email", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "withdraw-test@example.com" })

    const updated = await withdrawCase(negotiationCase.id)
    expect(updated.status).toBe("CANCELLED")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "CASE_WITHDRAWN" } })
    expect(audit).not.toBeNull()

    const emailCount = await testPrisma.emailLog.count({
      where: { template: "closure-summary", to: "withdraw-test@example.com" },
    })
    expect(emailCount).toBe(1)
  })

  it("refuses to withdraw once an offer is ready for decision", async () => {
    const negotiationCase = await createCase({ status: "OFFER_READY" })

    await expect(withdrawCase(negotiationCase.id)).rejects.toThrow("accept or decline")
  })

  it("refuses to withdraw an already-terminal case", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })

    await expect(withdrawCase(negotiationCase.id)).rejects.toThrow("already closed")
  })
})
