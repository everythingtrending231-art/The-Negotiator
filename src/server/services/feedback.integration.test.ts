import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createNegotiator } from "@/server/test/factories"
import { buildFeedbackUrl, issueFeedbackToken, resolveFeedbackToken, submitFeedback } from "./feedback"

describe("issueFeedbackToken", () => {
  it("creates a Feedback row hashed from the raw token, tied to the case and negotiator", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })

    const raw = await issueFeedbackToken(negotiationCase.id, negotiator.id)
    expect(raw).toBeTruthy()

    const stored = await testPrisma.feedback.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })
    expect(stored.tokenHash).not.toBe(raw)
    expect(stored.negotiatorId).toBe(negotiator.id)
    expect(stored.submittedAt).toBeNull()

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "FEEDBACK_TOKEN_ISSUED", relatedEntityId: stored.id } })
    expect(audit).not.toBeNull()
  })

  it("allows a null negotiatorId", async () => {
    const negotiationCase = await createCase()
    await issueFeedbackToken(negotiationCase.id, null)

    const stored = await testPrisma.feedback.findUniqueOrThrow({ where: { caseId: negotiationCase.id } })
    expect(stored.negotiatorId).toBeNull()
  })
})

describe("buildFeedbackUrl", () => {
  it("builds a /feedback/<token> URL from NEXT_PUBLIC_APP_URL", () => {
    const original = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = "https://negotiator.example"
    expect(buildFeedbackUrl("abc123")).toBe("https://negotiator.example/feedback/abc123")
    process.env.NEXT_PUBLIC_APP_URL = original
  })
})

describe("resolveFeedbackToken", () => {
  it("resolves a valid token to its feedback row and case ref", async () => {
    const negotiationCase = await createCase()
    const raw = await issueFeedbackToken(negotiationCase.id, null)

    const resolved = await resolveFeedbackToken(raw)
    expect(resolved?.caseId).toBe(negotiationCase.id)
    expect(resolved?.case.publicRef).toBe(negotiationCase.publicRef)
  })

  it("returns null for a token that doesn't exist", async () => {
    await expect(resolveFeedbackToken("not-a-real-token")).resolves.toBeNull()
  })
})

describe("submitFeedback", () => {
  it("records the four answers and marks the token used", async () => {
    const negotiationCase = await createCase()
    const raw = await issueFeedbackToken(negotiationCase.id, null)

    const updated = await submitFeedback(raw, {
      savedMoney: true,
      improvedDeal: true,
      negotiatorRating: 5,
      wouldUseAgain: true,
    })
    expect(updated.submittedAt).not.toBeNull()
    expect(updated.negotiatorRating).toBe(5)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "FEEDBACK_SUBMITTED", relatedEntityId: updated.id } })
    expect(audit).not.toBeNull()
  })

  it("refuses to submit twice for the same token", async () => {
    const negotiationCase = await createCase()
    const raw = await issueFeedbackToken(negotiationCase.id, null)
    await submitFeedback(raw, { savedMoney: true, improvedDeal: true, negotiatorRating: 5, wouldUseAgain: true })

    await expect(
      submitFeedback(raw, { savedMoney: false, improvedDeal: false, negotiatorRating: 1, wouldUseAgain: false }),
    ).rejects.toThrow("already been submitted")
  })

  it("refuses an invalid token", async () => {
    await expect(
      submitFeedback("not-a-real-token", { savedMoney: true, improvedDeal: true, negotiatorRating: 5, wouldUseAgain: true }),
    ).rejects.toThrow("no longer valid")
  })

  it("refuses a rating outside 1-5", async () => {
    const negotiationCase = await createCase()
    const raw = await issueFeedbackToken(negotiationCase.id, null)

    await expect(
      submitFeedback(raw, { savedMoney: true, improvedDeal: true, negotiatorRating: 6, wouldUseAgain: true }),
    ).rejects.toThrow("between 1 and 5")
  })
})
