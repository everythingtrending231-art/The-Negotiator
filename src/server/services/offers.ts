import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { applyStatusChangeInTx, isTerminal, sendOfferReadyEmail } from "@/server/services/cases"
import { sendEmail } from "@/server/email/send"
import { buildNegotiatorCaseUrl } from "@/server/urls"

export type CreateOfferInput = {
  caseId: string
  negotiatorId: string
  businessId: string
  originalValueCents?: number
  finalPriceCents: number
  currency?: string
  includedGoods: string
  additionalBenefits?: string
  conditions?: string
  validUntil?: Date
  paymentTerms?: string
  deliveryTerms?: string
}

// Phase 2 Stage 2: the Negotiator drafts every offer after negotiating
// with the business by phone — creating an offer is NOT presenting it.
// It starts PROPOSED (drafted, awaiting business confirmation) and the
// case moves to AWAITING_BUSINESS, not OFFER_READY. The business must
// confirm it via the Business Portal (confirmOffer, below) before the
// case becomes customer-visible.
export async function createOffer(input: CreateOfferInput) {
  const existing = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: input.caseId } })

  return prisma.$transaction(async (tx) => {
    const offer = await tx.offer.create({
      data: {
        caseId: input.caseId,
        businessId: input.businessId,
        negotiatorId: input.negotiatorId,
        originalValueCents: input.originalValueCents,
        finalPriceCents: input.finalPriceCents,
        currency: input.currency ?? "USD",
        includedGoods: input.includedGoods,
        additionalBenefits: input.additionalBenefits,
        conditions: input.conditions,
        validUntil: input.validUntil,
        paymentTerms: input.paymentTerms,
        deliveryTerms: input.deliveryTerms,
        status: "PROPOSED",
      },
    })

    await tx.negotiationCase.update({ where: { id: input.caseId }, data: { businessId: input.businessId } })

    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: input.negotiatorId,
      caseId: input.caseId,
      action: "OFFER_CREATED",
      relatedEntityType: "Offer",
      relatedEntityId: offer.id,
      after: { finalPriceCents: offer.finalPriceCents, status: offer.status },
      sourceChannel: "internal",
    })

    // We're proceeding with this business now — any other still-pending
    // invites for this case are moot. Withdraw them (never touches
    // invites already ACCEPTED/DECLINED, so response history stays
    // intact) with one summary audit row, not one per invite.
    const withdrawn = await tx.caseBusinessInvite.updateMany({
      where: { caseId: input.caseId, businessId: { not: input.businessId }, status: "PENDING" },
      data: { status: "WITHDRAWN" },
    })
    if (withdrawn.count > 0) {
      await recordAudit(tx, {
        actorType: "NEGOTIATOR",
        actorId: input.negotiatorId,
        caseId: input.caseId,
        action: "INVITES_WITHDRAWN",
        after: { count: withdrawn.count },
        sourceChannel: "internal",
      })
    }

    if (!isTerminal(existing.status)) {
      await applyStatusChangeInTx(
        tx,
        existing,
        "AWAITING_BUSINESS",
        { actorType: "NEGOTIATOR", actorId: input.negotiatorId },
        "internal",
      )
    }

    return offer
  })
}

// Business Portal confirms the Negotiator-drafted terms — this, not offer
// creation, is what makes a case customer-visible. Reuses the same shared
// status-transition core the Negotiator and customer paths already go
// through, so terminal handling/audit stays in the one place it's always
// lived.
export async function confirmOffer(caseId: string, offerId: string, businessContactId: string) {
  const existingCase = await prisma.negotiationCase.findUniqueOrThrow({ where: { id: caseId } })
  const existingOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } })

  if (existingOffer.customerDecision) {
    throw new Error("The customer has already decided on this offer.")
  }
  if (existingOffer.businessConfirmedAt) {
    throw new Error("This offer has already been confirmed.")
  }

  const { offer, shouldSendOfferReady } = await prisma.$transaction(async (tx) => {
    const offer = await tx.offer.update({
      where: { id: offerId },
      data: {
        status: "PRESENTED",
        businessContactId,
        businessConfirmedAt: new Date(),
        businessFeedback: null,
      },
    })

    await recordAudit(tx, {
      actorType: "BUSINESS",
      actorId: businessContactId,
      caseId,
      action: "OFFER_CONFIRMED",
      relatedEntityType: "Offer",
      relatedEntityId: offerId,
      before: { status: existingOffer.status },
      after: { status: offer.status },
      sourceChannel: "business",
    })

    let shouldSendOfferReady = false
    if (!isTerminal(existingCase.status)) {
      const result = await applyStatusChangeInTx(
        tx,
        existingCase,
        "OFFER_READY",
        { actorType: "BUSINESS", actorId: businessContactId },
        "business",
      )
      shouldSendOfferReady = result.shouldSendOfferReady
    }

    return { offer, shouldSendOfferReady }
  })

  if (shouldSendOfferReady) {
    await sendOfferReadyEmail(caseId)
  }

  return offer
}

export async function requestOfferChanges(caseId: string, offerId: string, businessContactId: string, note: string) {
  const existingOffer = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } })

  if (existingOffer.businessConfirmedAt) {
    throw new Error("This offer has already been confirmed and can no longer be sent back for changes.")
  }

  const offer = await prisma.$transaction(async (tx) => {
    const offer = await tx.offer.update({
      where: { id: offerId },
      data: { businessFeedback: note },
    })

    await recordAudit(tx, {
      actorType: "BUSINESS",
      actorId: businessContactId,
      caseId,
      action: "OFFER_CHANGES_REQUESTED",
      relatedEntityType: "Offer",
      relatedEntityId: offerId,
      after: { businessFeedback: note },
      sourceChannel: "business",
    })

    return offer
  })

  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { id: caseId },
    include: {
      business: { select: { name: true } },
      assignedNegotiator: { include: { user: { select: { email: true } } } },
    },
  })
  const negotiatorEmail = negotiationCase?.assignedNegotiator?.user?.email
  if (negotiationCase && negotiatorEmail) {
    await sendEmail({
      to: negotiatorEmail,
      template: "offer-changes-requested",
      data: {
        caseRef: negotiationCase.publicRef,
        businessName: negotiationCase.business?.name ?? "The business",
        note,
        portalUrl: buildNegotiatorCaseUrl(caseId),
      },
    })
  }

  return offer
}

export type UpdateOfferInput = {
  negotiatorId: string
  originalValueCents?: number
  finalPriceCents?: number
  currency?: string
  includedGoods?: string
  additionalBenefits?: string
  conditions?: string
  validUntil?: Date
  paymentTerms?: string
  deliveryTerms?: string
}

export async function updateOffer(caseId: string, offerId: string, input: UpdateOfferInput) {
  const existing = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } })
  if (existing.customerDecision) {
    throw new Error("The customer has already decided on this offer — it can no longer be edited.")
  }
  if (existing.businessConfirmedAt) {
    throw new Error("The business has already confirmed this offer — start a new offer round instead.")
  }

  return prisma.$transaction(async (tx) => {
    const before = { finalPriceCents: existing.finalPriceCents, status: existing.status }
    const updated = await tx.offer.update({
      where: { id: offerId },
      data: {
        originalValueCents: input.originalValueCents,
        finalPriceCents: input.finalPriceCents,
        currency: input.currency,
        includedGoods: input.includedGoods,
        additionalBenefits: input.additionalBenefits,
        conditions: input.conditions,
        validUntil: input.validUntil,
        paymentTerms: input.paymentTerms,
        deliveryTerms: input.deliveryTerms,
        // A re-drafted offer clears any pending business feedback — the
        // Negotiator's edit is the response to it.
        businessFeedback: null,
      },
    })
    await recordAudit(tx, {
      actorType: "NEGOTIATOR",
      actorId: input.negotiatorId,
      caseId,
      action: "OFFER_UPDATED",
      relatedEntityType: "Offer",
      relatedEntityId: offerId,
      before,
      after: { finalPriceCents: updated.finalPriceCents, status: updated.status },
      sourceChannel: "internal",
    })
    return updated
  })
}
