import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator } from "@/server/test/factories"
import { getNegotiatorAnalytics, getPlatformAnalytics } from "./analytics"

describe("getPlatformAnalytics", () => {
  it("returns all nulls/zeros on an empty database rather than dividing by zero", async () => {
    const analytics = await getPlatformAnalytics()
    expect(analytics.requestsSubmitted).toBe(0)
    expect(analytics.acceptanceRate).toBeNull()
    expect(analytics.offerRate).toBeNull()
    expect(analytics.repeatRequestRate).toBeNull()
    expect(analytics.disputeRate).toBeNull()
    expect(analytics.closedDealsCount).toBe(0)
    expect(analytics.totalDealValueCents).toBe(0)
    expect(analytics.feedbackResponseRate).toBeNull()
    expect(analytics.avgNegotiatorRating).toBeNull()
  })

  it("computes feedback response rate and averages only from submitted responses", async () => {
    const caseA = await createCase()
    const caseB = await createCase()
    await createCase() // no feedback issued at all — shouldn't affect the rate

    await testPrisma.feedback.create({
      data: { caseId: caseA.id, tokenHash: "hash-a", submittedAt: new Date(), savedMoney: true, improvedDeal: true, negotiatorRating: 5, wouldUseAgain: true },
    })
    await testPrisma.feedback.create({
      data: { caseId: caseB.id, tokenHash: "hash-b" }, // issued, never answered
    })

    const analytics = await getPlatformAnalytics()
    expect(analytics.feedbackResponseRate).toBe(0.5) // 1 of 2 issued tokens answered
    expect(analytics.avgNegotiatorRating).toBe(5)
    expect(analytics.savedMoneyRate).toBe(1)
    expect(analytics.wouldUseAgainRate).toBe(1)
  })

  it("computes acceptance rate, deal value totals, and cases-per-negotiator from real rows", async () => {
    const negotiator = await createNegotiator()

    const caseA = await createCase({ status: "ACCEPTED", assignedNegotiatorId: negotiator.id })
    const caseB = await createCase({ status: "DECLINED", assignedNegotiatorId: negotiator.id })
    await createCase({ status: "SUBMITTED" }) // unassigned — not "qualified"

    await testPrisma.offer.create({
      data: {
        caseId: caseA.id,
        businessId: (await testPrisma.business.create({ data: { name: "Biz A" } })).id,
        negotiatorId: negotiator.id,
        finalPriceCents: 9000,
        originalValueCents: 10000,
        includedGoods: "Widget",
        customerDecision: "ACCEPTED",
      },
    })
    await testPrisma.offer.create({
      data: {
        caseId: caseB.id,
        businessId: (await testPrisma.business.create({ data: { name: "Biz B" } })).id,
        negotiatorId: negotiator.id,
        finalPriceCents: 5000,
        includedGoods: "Gadget",
        customerDecision: "DECLINED",
      },
    })

    const analytics = await getPlatformAnalytics()

    expect(analytics.requestsSubmitted).toBe(3)
    expect(analytics.requestsQualified).toBe(2) // assigned: caseA + caseB
    expect(analytics.acceptanceRate).toBe(0.5) // 1 accepted of 2 decided
    expect(analytics.closedDealsCount).toBe(1)
    expect(analytics.totalDealValueCents).toBe(9000)
    expect(analytics.avgDealValueCents).toBe(9000)
    expect(analytics.casesPerNegotiator).toEqual([{ negotiatorId: negotiator.id, negotiatorName: negotiator.name, count: 2 }])
  })

  it("counts a repeat customer email toward repeatRequestRate", async () => {
    const negotiationCaseA = await createCase()
    const negotiationCaseB = await createCase()
    await testPrisma.negotiationTicket.create({ data: { negotiationCaseId: negotiationCaseA.id, customerEmail: "repeat@example.com" } })
    await testPrisma.negotiationTicket.create({ data: { negotiationCaseId: negotiationCaseB.id, customerEmail: "repeat@example.com" } })

    const analytics = await getPlatformAnalytics()
    expect(analytics.repeatRequestRate).toBe(1) // 1 of 1 distinct email group had >1 ticket
  })
})

describe("getNegotiatorAnalytics", () => {
  it("scopes every metric to the given negotiator only", async () => {
    const negotiatorA = await createNegotiator()
    const negotiatorB = await createNegotiator()

    const caseA = await createCase({ status: "ACCEPTED", assignedNegotiatorId: negotiatorA.id })
    await createCase({ status: "NEGOTIATING", assignedNegotiatorId: negotiatorA.id })
    await createCase({ status: "ACCEPTED", assignedNegotiatorId: negotiatorB.id })

    const business = await testPrisma.business.create({ data: { name: "Biz" } })
    await testPrisma.offer.create({
      data: {
        caseId: caseA.id,
        businessId: business.id,
        negotiatorId: negotiatorA.id,
        finalPriceCents: 8000,
        includedGoods: "Widget",
        customerDecision: "ACCEPTED",
      },
    })

    const analytics = await getNegotiatorAnalytics(negotiatorA.id)
    expect(analytics.totalCases).toBe(2)
    expect(analytics.acceptanceRate).toBe(1)
    expect(analytics.casesByStatus.sort((a, b) => a.status.localeCompare(b.status))).toEqual(
      [
        { status: "ACCEPTED", count: 1 },
        { status: "NEGOTIATING", count: 1 },
      ].sort((a, b) => a.status.localeCompare(b.status)),
    )
  })

  it("returns zeroed/null metrics for a negotiator with no cases", async () => {
    const negotiator = await createNegotiator()
    const analytics = await getNegotiatorAnalytics(negotiator.id)
    expect(analytics.totalCases).toBe(0)
    expect(analytics.acceptanceRate).toBeNull()
    expect(analytics.avgNegotiationDurationHours).toBeNull()
    expect(analytics.avgNegotiatorRating).toBeNull()
  })

  it("scopes feedback metrics to the given negotiator only", async () => {
    const negotiatorA = await createNegotiator()
    const negotiatorB = await createNegotiator()
    const caseA = await createCase({ assignedNegotiatorId: negotiatorA.id })
    const caseB = await createCase({ assignedNegotiatorId: negotiatorB.id })

    await testPrisma.feedback.create({
      data: {
        caseId: caseA.id,
        negotiatorId: negotiatorA.id,
        tokenHash: "hash-a",
        submittedAt: new Date(),
        negotiatorRating: 4,
        savedMoney: true,
        improvedDeal: true,
        wouldUseAgain: true,
      },
    })
    await testPrisma.feedback.create({
      data: {
        caseId: caseB.id,
        negotiatorId: negotiatorB.id,
        tokenHash: "hash-b",
        submittedAt: new Date(),
        negotiatorRating: 1,
        savedMoney: false,
        improvedDeal: false,
        wouldUseAgain: false,
      },
    })

    const analytics = await getNegotiatorAnalytics(negotiatorA.id)
    expect(analytics.avgNegotiatorRating).toBe(4)
  })
})
