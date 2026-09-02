import type { ActorType, CaseStatus, Prisma } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { issueAccessToken, revokeTicketTokens, buildCaseUrl } from "@/server/services/tokens"
import { sendEmail } from "@/server/email/send"

// PRD §7 names these five as terminal (they trigger dashboard-access
// closure per §6a). Completed/Disputed are treated as non-terminal
// intermediate states a Negotiator must manually move out of — the docs
// don't define their relationship to Closed, so this is an
// implementation default, not a documented rule (see plan assumption 2).
const TERMINAL_STATUSES: CaseStatus[] = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CLOSED"]

export function isTerminal(status: CaseStatus) {
  return TERMINAL_STATUSES.includes(status)
}

function generatePublicRef(sequence: number) {
  return `NEG-${String(sequence).padStart(6, "0")}`
}

// Shared by every path that can move a case into a terminal status
// (manual internal status change, and customer accept/decline) so
// token-revocation + one-time closure-email guarding only lives in one
// place.
export async function applyStatusChangeInTx(
  tx: Prisma.TransactionClient,
  negotiationCase: { id: string; status: CaseStatus },
  newStatus: CaseStatus,
  actor: { actorType: ActorType; actorId?: string | null },
  sourceChannel: string,
) {
  await tx.negotiationCase.update({ where: { id: negotiationCase.id }, data: { status: newStatus } })

  await recordAudit(tx, {
    actorType: actor.actorType,
    actorId: actor.actorId,
    caseId: negotiationCase.id,
    action: "STATUS_CHANGED",
    before: { status: negotiationCase.status },
    after: { status: newStatus },
    sourceChannel,
  })

  let shouldSendClosureSummary = false

  if (isTerminal(newStatus)) {
    const ticket = await tx.negotiationTicket.findUnique({ where: { negotiationCaseId: negotiationCase.id } })
    if (ticket) {
      await revokeTicketTokens(tx, ticket.id, negotiationCase.id)
      if (!ticket.closureSummarySentAt) {
        await tx.negotiationTicket.update({
          where: { id: ticket.id },
          data: { status: "CLOSED", closedAt: new Date(), closureSummarySentAt: new Date() },
        })
        shouldSendClosureSummary = true
      }
    }
  }

  // Fires whenever a case newly reaches OFFER_READY — via a business
  // confirming an offer (offers.ts confirmOffer), or a Negotiator manually
  // overriding status (setCaseStatus below). Guarded on the prior status so
  // a no-op re-application doesn't re-send.
  const shouldSendOfferReady = newStatus === "OFFER_READY" && negotiationCase.status !== "OFFER_READY"

  return { shouldSendClosureSummary, shouldSendOfferReady }
}

async function sendClosureSummaryEmail(caseId: string) {
  const negotiationCase = await prisma.negotiationCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      ticket: true,
      business: true,
      offers: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!negotiationCase.ticket) return

  // A Negotiator-drafted PROPOSED offer the business never confirmed must
  // never appear in the customer's closure summary either.
  const latestOffer = negotiationCase.offers.find((offer) => offer.status !== "PROPOSED")

  await sendEmail({
    to: negotiationCase.ticket.customerEmail,
    template: "closure-summary",
    data: {
      caseRef: negotiationCase.publicRef,
      status: negotiationCase.status,
      offerSummary: latestOffer
        ? {
            finalPriceCents: latestOffer.finalPriceCents,
            currency: latestOffer.currency,
            includedGoods: latestOffer.includedGoods,
            businessName: negotiationCase.business?.name,
          }
        : null,
      supportEmail: process.env.SUPPORT_EMAIL ?? "support@example.com",
    },
  })
}

// Modeled directly on tickets.ts's resendTicketToken: OFFER_READY doesn't
// revoke the customer's tokens (only terminal statuses do), but we can't
// re-embed their original link (the raw token is never persisted), so a
// fresh one is issued the same way a resend already does elsewhere.
export async function sendOfferReadyEmail(caseId: string) {
  const negotiationCase = await prisma.negotiationCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { ticket: true },
  })
  if (!negotiationCase.ticket || negotiationCase.ticket.status !== "ACTIVE") return

  const ticketId = negotiationCase.ticket.id
  const raw = await prisma.$transaction(async (tx) => {
    await revokeTicketTokens(tx, ticketId, caseId)
    const { raw } = await issueAccessToken(tx, ticketId, caseId)
    return raw
  })

  await sendEmail({
    to: negotiationCase.ticket.customerEmail,
    template: "offer-ready",
    data: { caseRef: negotiationCase.publicRef, magicLinkUrl: buildCaseUrl(raw) },
  })
}

export type CreateCaseInput = {
  email: string
  categoryId: string
  description: string
  url?: string
  targetPriceCents?: number
  maxBudgetCents?: number
  currency?: string
  quantity?: number
  desiredDate?: Date
  location?: string
  notes?: string
  categoryFieldValues?: Record<string, unknown>
  customerPreferredBusinessId?: string
}

export async function createCase(input: CreateCaseInput) {
  const startingCount = await prisma.negotiationCase.count()

  const { negotiationCase, ticket, rawToken } = await prisma.$transaction(async (tx) => {
    let negotiationCase: Awaited<ReturnType<typeof tx.negotiationCase.create>> | undefined
    let lastError: unknown

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        negotiationCase = await tx.negotiationCase.create({
          data: {
            publicRef: generatePublicRef(startingCount + 1 + attempt),
            status: "SUBMITTED",
            categoryId: input.categoryId,
            description: input.description,
            url: input.url,
            targetPriceCents: input.targetPriceCents,
            maxBudgetCents: input.maxBudgetCents,
            currency: input.currency ?? "USD",
            quantity: input.quantity,
            desiredDate: input.desiredDate,
            location: input.location,
            notes: input.notes,
            categoryFieldValues: input.categoryFieldValues as Prisma.InputJsonValue | undefined,
            customerPreferredBusinessId: input.customerPreferredBusinessId,
          },
        })
        break
      } catch (error) {
        lastError = error
      }
    }
    if (!negotiationCase) throw lastError ?? new Error("Failed to create case")

    await recordAudit(tx, {
      actorType: "CUSTOMER",
      caseId: negotiationCase.id,
      action: "CASE_CREATED",
      after: { status: negotiationCase.status },
      sourceChannel: "web",
    })

    const ticket = await tx.negotiationTicket.create({
      data: { negotiationCaseId: negotiationCase.id, customerEmail: input.email },
    })

    const { raw } = await issueAccessToken(tx, ticket.id, negotiationCase.id)

    return { negotiationCase, ticket, rawToken: raw }
  })

  await sendEmail({
    to: ticket.customerEmail,
    template: "ticket-confirmation",
    data: {
      caseRef: negotiationCase.publicRef,
      magicLinkUrl: buildCaseUrl(rawToken),
      description: negotiationCase.description,
    },
  })

  return { negotiationCase, ticket }
}

export async function assignNegotiator(caseId: string, negotiatorId: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  const nextStatus: CaseStatus =
    existing.status === "SUBMITTED" || existing.status === "UNDER_REVIEW" ? "ASSIGNED" : existing.status

  await prisma.$transaction(async (tx) => {
    await tx.negotiationCase.update({
      where: { id: caseId },
      data: { assignedNegotiatorId: negotiatorId, status: nextStatus },
    })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: negotiatorId,
      caseId,
      action: "CASE_ASSIGNED",
      before: { assignedNegotiatorId: existing.assignedNegotiatorId, status: existing.status },
      after: { assignedNegotiatorId: negotiatorId, status: nextStatus },
      sourceChannel: "internal",
    })
  })

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

export async function setCaseStatus(caseId: string, newStatus: CaseStatus, negotiatorId: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })

  const { shouldSendClosureSummary, shouldSendOfferReady } = await prisma.$transaction((tx) =>
    applyStatusChangeInTx(tx, existing, newStatus, { actorType: "NEGOTIATOR", actorId: negotiatorId }, "internal"),
  )

  if (shouldSendClosureSummary) {
    await sendClosureSummaryEmail(caseId)
  }
  if (shouldSendOfferReady) {
    await sendOfferReadyEmail(caseId)
  }

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

// Manual negotiator-flagged escalation — see the schema comment on
// NegotiationCase.escalated for why this is a plain flag rather than any
// automated/threshold-driven mechanism.
export async function escalateCase(caseId: string, reason: string, negotiatorId: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })

  await prisma.$transaction(async (tx) => {
    await tx.negotiationCase.update({
      where: { id: caseId },
      data: { escalated: true, escalatedAt: new Date(), escalatedReason: reason },
    })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: negotiatorId,
      caseId,
      action: "CASE_ESCALATED",
      before: { escalated: existing.escalated },
      after: { escalated: true, escalatedReason: reason },
      sourceChannel: "internal",
    })
  })

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

export async function unescalateCase(caseId: string, negotiatorId: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })

  await prisma.$transaction(async (tx) => {
    await tx.negotiationCase.update({
      where: { id: caseId },
      data: { escalated: false, escalatedAt: null, escalatedReason: null },
    })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: negotiatorId,
      caseId,
      action: "CASE_UNESCALATED",
      before: { escalated: existing.escalated, escalatedReason: existing.escalatedReason },
      after: { escalated: false },
      sourceChannel: "internal",
    })
  })

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

// Admin override: reassigns to a different Negotiator without touching
// status — unlike assignNegotiator (a Negotiator claiming an unassigned
// case, which also bumps SUBMITTED/UNDER_REVIEW to ASSIGNED), this can
// move an already-in-progress case to someone else without resetting its
// progress.
export async function adminReassignCase(caseId: string, negotiatorId: string, adminId: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })

  await prisma.$transaction(async (tx) => {
    await tx.negotiationCase.update({ where: { id: caseId }, data: { assignedNegotiatorId: negotiatorId } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: adminId,
      caseId,
      action: "CASE_REASSIGNED",
      before: { assignedNegotiatorId: existing.assignedNegotiatorId },
      after: { assignedNegotiatorId: negotiatorId },
      sourceChannel: "internal",
    })
  })

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

// Admin override: force-closes a case regardless of its current state.
// Reuses the same terminal-status machinery (token revocation, one-time
// closure email) every other path into a terminal status goes through, plus
// a distinct CASE_FORCE_CLOSED audit row (carrying the reason, if any) so
// this reads differently from an ordinary negotiator status change.
export async function adminForceCloseCase(caseId: string, adminId: string, reason?: string) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  if (isTerminal(existing.status)) {
    throw new Error("This case is already closed.")
  }

  const { shouldSendClosureSummary } = await prisma.$transaction(async (tx) => {
    const result = await applyStatusChangeInTx(
      tx,
      existing,
      "CLOSED",
      { actorType: "ADMIN", actorId: adminId },
      "internal",
    )
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: adminId,
      caseId,
      action: "CASE_FORCE_CLOSED",
      before: { status: existing.status },
      after: { status: "CLOSED", reason: reason ?? null },
      sourceChannel: "internal",
    })
    return result
  })

  if (shouldSendClosureSummary) {
    await sendClosureSummaryEmail(caseId)
  }

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}

export type CustomerDecision = "ACCEPTED" | "DECLINED" | "REQUESTED_ANOTHER_ROUND"

export async function recordCustomerDecision(caseId: string, offerId: string, decision: CustomerDecision) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  const offer = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } })

  if (offer.caseId !== caseId) {
    throw new Error("This offer does not belong to this case.")
  }
  // The business must have confirmed the offer (Phase 2 Stage 2) before a
  // customer can act on it — otherwise a forged offerId for a still-PROPOSED
  // draft could be "accepted" straight past the confirmation gate.
  if (offer.status !== "PRESENTED") {
    throw new Error("This offer is not available for a decision yet.")
  }
  if (isTerminal(existing.status)) {
    throw new Error("This case is already closed.")
  }

  const newCaseStatus: CaseStatus =
    decision === "ACCEPTED" ? "ACCEPTED" : decision === "DECLINED" ? "DECLINED" : "NEGOTIATING"
  const offerStatus = decision === "ACCEPTED" ? "ACCEPTED" : decision === "DECLINED" ? "DECLINED" : "SUPERSEDED"

  const { shouldSendClosureSummary } = await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offerId },
      data: { customerDecision: decision, decidedAt: new Date(), status: offerStatus },
    })
    await recordAudit(tx, {
      actorType: "CUSTOMER",
      caseId,
      action: "OFFER_UPDATED",
      relatedEntityType: "Offer",
      relatedEntityId: offerId,
      before: { customerDecision: offer.customerDecision, status: offer.status },
      after: { customerDecision: decision, status: offerStatus },
      sourceChannel: "web",
    })
    return applyStatusChangeInTx(tx, existing, newCaseStatus, { actorType: "CUSTOMER" }, "web")
  })

  if (shouldSendClosureSummary) {
    await sendClosureSummaryEmail(caseId)
  }

  return prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
}
