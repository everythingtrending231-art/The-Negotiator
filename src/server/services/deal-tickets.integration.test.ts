import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createBusiness, createCase, createCategory } from "@/server/test/factories"
import { issueDealTicket, resolveDealTicket } from "./deal-tickets"

describe("issueDealTicket", () => {
  it("creates a ticket snapshotting the given terms and records an audit row", async () => {
    const category = await createCategory({ name: "Hotels" })
    const negotiationCase = await createCase({ categoryId: category.id })
    const business = await createBusiness({ name: "Sunny Hotel" })

    const raw = await issueDealTicket(negotiationCase.id, {
      businessName: business.name,
      categoryName: category.name,
      finalPriceCents: 12000,
      currency: "USD",
      includedGoods: "Two nights, deluxe room",
      additionalBenefits: "Free breakfast",
      conditions: "Non-refundable",
      paymentTerms: "Pay at hotel",
      deliveryTerms: null,
      validUntil: null,
    })

    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/)

    const ticket = await testPrisma.dealTicket.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })
    expect(ticket.businessName).toBe("Sunny Hotel")
    expect(ticket.finalPriceCents).toBe(12000)
    expect(ticket.additionalBenefits).toBe("Free breakfast")

    const audit = await testPrisma.auditLog.findFirst({
      where: { caseId: negotiationCase.id, action: "DEAL_TICKET_ISSUED" },
    })
    expect(audit).not.toBeNull()
  })
})

describe("resolveDealTicket", () => {
  it("round-trips a raw token back to its ticket, including the case's publicRef", async () => {
    const category = await createCategory()
    const negotiationCase = await createCase({ categoryId: category.id })
    const business = await createBusiness()

    const raw = await issueDealTicket(negotiationCase.id, {
      businessName: business.name,
      categoryName: category.name,
      finalPriceCents: 5000,
      currency: "USD",
      includedGoods: "One widget",
      additionalBenefits: null,
      conditions: null,
      paymentTerms: null,
      deliveryTerms: null,
      validUntil: null,
    })

    const resolved = await resolveDealTicket(raw)
    expect(resolved?.case.publicRef).toBe(negotiationCase.publicRef)
    expect(resolved?.finalPriceCents).toBe(5000)
  })

  it("returns null for an unrecognized token", async () => {
    const resolved = await resolveDealTicket("not-a-real-token")
    expect(resolved).toBeNull()
  })
})
