import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { applyStatusChangeInTx, isTerminal } from "@/server/services/cases"

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

// Creating an offer *is* presenting it in Phase 1 — there's no separate
// "send offer" step in this pass's scope, so status jumps straight to
// PRESENTED / case OFFER_READY (implementation default, see plan
// assumption 9 — the docs give the status list, not transition rules).
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
        status: "PRESENTED",
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

    if (!isTerminal(existing.status)) {
      await applyStatusChangeInTx(
        tx,
        existing,
        "OFFER_READY",
        { actorType: "NEGOTIATOR", actorId: input.negotiatorId },
        "internal",
      )
    }

    return offer
  })
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
