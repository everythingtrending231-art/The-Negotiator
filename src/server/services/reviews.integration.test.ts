import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator } from "@/server/test/factories"
import { listReviews } from "./reviews"

async function createSubmittedFeedback(caseId: string, negotiatorId: string | null, overrides: Partial<{
  savedMoney: boolean
  improvedDeal: boolean
  negotiatorRating: number
  wouldUseAgain: boolean
  submittedAt: Date
}> = {}) {
  return testPrisma.feedback.create({
    data: {
      caseId,
      negotiatorId,
      tokenHash: `hash-${caseId}`,
      savedMoney: overrides.savedMoney ?? true,
      improvedDeal: overrides.improvedDeal ?? true,
      negotiatorRating: overrides.negotiatorRating ?? 5,
      wouldUseAgain: overrides.wouldUseAgain ?? true,
      submittedAt: overrides.submittedAt ?? new Date(),
    },
  })
}

describe("listReviews", () => {
  it("only returns feedback that's been submitted", async () => {
    const negotiator = await createNegotiator()
    const submittedCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const unansweredCase = await createCase({ assignedNegotiatorId: negotiator.id })
    await createSubmittedFeedback(submittedCase.id, negotiator.id)
    await testPrisma.feedback.create({
      data: { caseId: unansweredCase.id, negotiatorId: negotiator.id, tokenHash: `hash-${unansweredCase.id}` },
    })

    const reviews = await listReviews()

    expect(reviews).toHaveLength(1)
    expect(reviews[0].case.id).toBe(submittedCase.id)
    expect(reviews[0].negotiatorName).toBe(negotiator.name)
  })

  it("filters by negotiatorId when given", async () => {
    const negotiatorA = await createNegotiator()
    const negotiatorB = await createNegotiator()
    const caseA = await createCase({ assignedNegotiatorId: negotiatorA.id })
    const caseB = await createCase({ assignedNegotiatorId: negotiatorB.id })
    await createSubmittedFeedback(caseA.id, negotiatorA.id)
    await createSubmittedFeedback(caseB.id, negotiatorB.id)

    const reviews = await listReviews({ negotiatorId: negotiatorA.id })

    expect(reviews).toHaveLength(1)
    expect(reviews[0].case.id).toBe(caseA.id)
  })

  it("orders newest-submitted first", async () => {
    const negotiator = await createNegotiator()
    const older = await createCase({ assignedNegotiatorId: negotiator.id })
    const newer = await createCase({ assignedNegotiatorId: negotiator.id })
    await createSubmittedFeedback(older.id, negotiator.id, { submittedAt: new Date("2026-01-01") })
    await createSubmittedFeedback(newer.id, negotiator.id, { submittedAt: new Date("2026-06-01") })

    const reviews = await listReviews()

    expect(reviews.map((r) => r.case.id)).toEqual([newer.id, older.id])
  })
})
