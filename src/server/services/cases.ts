import type { ActorType, CaseStatus, Prisma } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { issueAccessToken, revokeTicketTokens, buildCaseUrl } from "@/server/services/tokens"
import { buildFeedbackUrl, issueFeedbackToken, reissueFeedbackToken } from "@/server/services/feedback"
import { buildTicketUrl, issueDealTicket, reissueDealTicketToken } from "@/server/services/deal-tickets"
import { generateTicketQrCodePngBuffer } from "@/server/services/deal-ticket-qr"
import { renderDealTicketPdf } from "@/server/services/deal-ticket-pdf"
import { sendEmail, type EmailAttachment } from "@/server/email/send"
import { getSetting } from "@/server/services/settings"
import { buildAccountUrl } from "@/server/services/customer-accounts"

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

async function sendClosureSummaryEmail(caseId: string, dealTicketUrl?: string | null) {
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

  // Issued here, not earlier — this is the one point every terminal-status
  // path already funnels through exactly once (guarded by
  // ticket.closureSummarySentAt in applyStatusChangeInTx), so the feedback
  // ask can piggyback on the closure email instead of needing its own
  // separate trigger/send (docs/03 §12).
  const feedbackToken = await issueFeedbackToken(caseId, negotiationCase.assignedNegotiatorId)
  const supportEmail = await getSetting("supportEmail")

  // A PDF copy of the deal ticket rides along as an attachment — the same
  // branded content the ticket page shows, so the customer has it even
  // without clicking through. Only built when a ticket actually exists
  // (customer-acceptance path); regenerated from the DealTicket row rather
  // than threaded through as a parameter, since the raw token (needed for
  // the QR code) isn't available here — only the URL is.
  let attachments: EmailAttachment[] | undefined
  if (dealTicketUrl) {
    const dealTicket = await prisma.dealTicket.findUnique({ where: { caseId } })
    if (dealTicket) {
      const qrCodePngBuffer = await generateTicketQrCodePngBuffer(dealTicketUrl)
      const pdfBuffer = await renderDealTicketPdf(
        {
          publicRef: negotiationCase.publicRef,
          businessName: dealTicket.businessName,
          categoryName: dealTicket.categoryName,
          finalPriceCents: dealTicket.finalPriceCents,
          currency: dealTicket.currency,
          includedGoods: dealTicket.includedGoods,
          additionalBenefits: dealTicket.additionalBenefits,
          conditions: dealTicket.conditions,
          paymentTerms: dealTicket.paymentTerms,
          deliveryTerms: dealTicket.deliveryTerms,
          validUntil: dealTicket.validUntil,
          createdAt: dealTicket.createdAt,
        },
        qrCodePngBuffer,
      )
      attachments = [
        { filename: `deal-ticket-${negotiationCase.publicRef}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
      ]
    }
  }

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
      supportEmail,
      feedbackUrl: buildFeedbackUrl(feedbackToken),
      accountUrl: buildAccountUrl(),
      // Only set on the customer-acceptance path (recordCustomerDecision) —
      // a negotiator-manual or admin-force closure has no accepted offer to
      // issue a ticket against.
      dealTicketUrl: dealTicketUrl ?? null,
    },
    attachments,
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
  attachmentUrls?: string[]
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
            attachmentUrls: input.attachmentUrls ?? [],
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

    // Auto-aggregate under an existing account (docs/08 §4.3) — a
    // returning customer's new tickets link up without them re-doing
    // anything; a customer without an account is entirely unaffected.
    const existingAccount = await tx.customerAccount.findUnique({
      where: { email: input.email.toLowerCase() },
    })

    const ticket = await tx.negotiationTicket.create({
      data: {
        negotiationCaseId: negotiationCase.id,
        customerEmail: input.email,
        customerAccountId: existingAccount?.id,
      },
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

// docs/07_OPERATIONS_AND_ORG.md §6.1 SOP — the sole channel for a customer
// to get their record after the case's own dashboard/magic-link access has
// ended (docs/03 §10.1: never self-service). Support verifies identity and
// obtains approval *before* calling this — the verificationNote is that
// evidence, recorded in the audit trail per the SOP's step 6. Reissues
// fresh tokens for the feedback survey (if not yet answered) and the deal
// ticket (if one was issued) rather than reusing the originals, since
// their raw tokens were never persisted — same "revoke old, issue new"
// shape the rest of this codebase already uses for resends.
export async function resendClosureRecord(caseId: string, adminId: string, verificationNote: string) {
  if (!verificationNote.trim()) {
    throw new Error("A verification note is required.")
  }

  const negotiationCase = await prisma.negotiationCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      ticket: true,
      business: true,
      offers: { orderBy: { createdAt: "desc" } },
      feedback: true,
      dealTicket: true,
    },
  })
  if (!negotiationCase.ticket) {
    throw new Error("This case has no customer ticket.")
  }
  if (!isTerminal(negotiationCase.status)) {
    throw new Error("This case hasn't closed yet.")
  }

  const latestOffer = negotiationCase.offers.find((offer) => offer.status !== "PROPOSED")
  const supportEmail = await getSetting("supportEmail")

  const feedbackUrl =
    negotiationCase.feedback && !negotiationCase.feedback.submittedAt
      ? buildFeedbackUrl(await reissueFeedbackToken(negotiationCase.feedback.id))
      : null

  let dealTicketUrl: string | null = null
  let attachments: EmailAttachment[] | undefined
  if (negotiationCase.dealTicket) {
    const raw = await reissueDealTicketToken(caseId)
    dealTicketUrl = buildTicketUrl(raw)
    const qrCodePngBuffer = await generateTicketQrCodePngBuffer(dealTicketUrl)
    const pdfBuffer = await renderDealTicketPdf(
      {
        publicRef: negotiationCase.publicRef,
        businessName: negotiationCase.dealTicket.businessName,
        categoryName: negotiationCase.dealTicket.categoryName,
        finalPriceCents: negotiationCase.dealTicket.finalPriceCents,
        currency: negotiationCase.dealTicket.currency,
        includedGoods: negotiationCase.dealTicket.includedGoods,
        additionalBenefits: negotiationCase.dealTicket.additionalBenefits,
        conditions: negotiationCase.dealTicket.conditions,
        paymentTerms: negotiationCase.dealTicket.paymentTerms,
        deliveryTerms: negotiationCase.dealTicket.deliveryTerms,
        validUntil: negotiationCase.dealTicket.validUntil,
        createdAt: negotiationCase.dealTicket.createdAt,
      },
      qrCodePngBuffer,
    )
    attachments = [
      { filename: `deal-ticket-${negotiationCase.publicRef}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
    ]
  }

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
      supportEmail,
      feedbackUrl,
      accountUrl: buildAccountUrl(),
      dealTicketUrl,
    },
    attachments,
  })

  await prisma.$transaction((tx) =>
    recordAudit(tx, {
      actorType: "ADMIN",
      actorId: adminId,
      caseId,
      action: "POST_CLOSURE_RECORD_RESENT",
      after: { verificationNote, to: negotiationCase.ticket!.customerEmail },
      sourceChannel: "internal",
    }),
  )
}

export type CustomerDecision = "ACCEPTED" | "DECLINED" | "REQUESTED_ANOTHER_ROUND"

export async function recordCustomerDecision(caseId: string, offerId: string, decision: CustomerDecision) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { category: true },
  })
  const offer = await prisma.offer.findUniqueOrThrow({ where: { id: offerId }, include: { business: true } })

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

  // Own transaction (same convention as issueFeedbackToken), issued
  // whenever the customer actually accepts — independent of
  // shouldSendClosureSummary, which only guards the closure email's
  // one-time idempotency and isn't specific to acceptance. Built here (not
  // deferred into sendClosureSummaryEmail) so the raw URL can flow straight
  // back into the API response: the case dashboard's AccessToken is
  // already revoked by this point, so this is the only moment the customer
  // can be handed the link before their page goes dead.
  let dealTicketUrl: string | null = null
  if (decision === "ACCEPTED") {
    const raw = await issueDealTicket(caseId, {
      businessName: offer.business.name,
      categoryName: existing.category.name,
      finalPriceCents: offer.finalPriceCents,
      currency: offer.currency,
      includedGoods: offer.includedGoods,
      additionalBenefits: offer.additionalBenefits,
      conditions: offer.conditions,
      paymentTerms: offer.paymentTerms,
      deliveryTerms: offer.deliveryTerms,
      validUntil: offer.validUntil,
    })
    dealTicketUrl = buildTicketUrl(raw)
  }

  if (shouldSendClosureSummary) {
    await sendClosureSummaryEmail(caseId, dealTicketUrl)
  }

  const negotiationCase = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  return { negotiationCase, dealTicketUrl }
}
