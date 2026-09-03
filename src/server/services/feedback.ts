import crypto from "node:crypto"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

// Same convention as tokens.ts: the raw token only ever exists in the
// emailed URL, never persisted or logged in plaintext.
function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function buildFeedbackUrl(rawToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/feedback/${rawToken}`
}

// Called once, at the same moment the closure-summary email fires (see
// cases.ts::sendClosureSummaryEmail) — creates the row up front, before
// any answers exist, so the emailed link has something to resolve to.
export async function issueFeedbackToken(caseId: string, negotiatorId: string | null) {
  const raw = generateRawToken()
  await prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: { caseId, negotiatorId, tokenHash: hashToken(raw) },
    })
    await recordAudit(tx, {
      actorType: "SYSTEM",
      caseId,
      action: "FEEDBACK_TOKEN_ISSUED",
      relatedEntityType: "Feedback",
      relatedEntityId: feedback.id,
      sourceChannel: "system",
    })
  })
  return raw
}

// Not-found and already-submitted are both surfaced to the caller (unlike
// resolveAccessToken, which collapses every failure to the same generic
// state) — the feedback page shows a distinct, friendlier "you already
// told us, thanks" message rather than reusing "this link isn't valid".
export async function resolveFeedbackToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  return prisma.feedback.findUnique({
    where: { tokenHash },
    include: { case: { select: { publicRef: true } } },
  })
}

export type SubmitFeedbackInput = {
  savedMoney: boolean
  improvedDeal: boolean
  negotiatorRating: number
  wouldUseAgain: boolean
}

export async function submitFeedback(rawToken: string, input: SubmitFeedbackInput) {
  if (!Number.isInteger(input.negotiatorRating) || input.negotiatorRating < 1 || input.negotiatorRating > 5) {
    throw new Error("Rating must be a whole number between 1 and 5.")
  }

  const tokenHash = hashToken(rawToken)
  const feedback = await prisma.feedback.findUnique({ where: { tokenHash } })
  if (!feedback) {
    throw new Error("This feedback link is no longer valid.")
  }
  if (feedback.submittedAt) {
    throw new Error("Feedback has already been submitted for this case.")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.feedback.update({
      where: { id: feedback.id },
      data: {
        savedMoney: input.savedMoney,
        improvedDeal: input.improvedDeal,
        negotiatorRating: input.negotiatorRating,
        wouldUseAgain: input.wouldUseAgain,
        submittedAt: new Date(),
      },
    })
    await recordAudit(tx, {
      actorType: "CUSTOMER",
      caseId: feedback.caseId,
      action: "FEEDBACK_SUBMITTED",
      relatedEntityType: "Feedback",
      relatedEntityId: feedback.id,
      after: {
        savedMoney: input.savedMoney,
        improvedDeal: input.improvedDeal,
        negotiatorRating: input.negotiatorRating,
        wouldUseAgain: input.wouldUseAgain,
      },
      sourceChannel: "web",
    })
    return updated
  })
}
