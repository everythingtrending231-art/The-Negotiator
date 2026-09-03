import type { AgreementType, BusinessVerificationStatus, Prisma } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

type Actor = { id: string }

export type BusinessLocation = {
  label?: string
  address?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

export type CreateBusinessInput = {
  name: string
  description?: string
  logoUrl?: string
  categoryIds: string[]
  locations?: BusinessLocation[]
  customerVisible?: boolean
  relationshipOwnerId?: string
}

export async function createBusiness(input: CreateBusinessInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.name,
        description: input.description,
        logoUrl: input.logoUrl,
        customerVisible: input.customerVisible ?? true,
        relationshipOwnerId: input.relationshipOwnerId,
        locations: input.locations as Prisma.InputJsonValue | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_CREATED",
      relatedEntityType: "Business",
      relatedEntityId: business.id,
      after: { name: business.name },
      sourceChannel: "internal",
    })
    return business
  })
}

export type UpdateBusinessProfileInput = {
  name?: string
  description?: string
  logoUrl?: string
  categoryIds?: string[]
  locations?: BusinessLocation[]
  relationshipOwnerId?: string | null
}

export async function updateBusinessProfile(id: string, input: UpdateBusinessProfileInput, actor: Actor) {
  const existing = await prisma.business.findUniqueOrThrow({ where: { id } })

  return prisma.$transaction(async (tx) => {
    if (input.categoryIds) {
      await tx.businessCategory.deleteMany({ where: { businessId: id } })
      await tx.businessCategory.createMany({
        data: input.categoryIds.map((categoryId) => ({ businessId: id, categoryId })),
      })
    }

    const updated = await tx.business.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        logoUrl: input.logoUrl,
        relationshipOwnerId: input.relationshipOwnerId,
        locations: input.locations as Prisma.InputJsonValue | undefined,
        updatedBy: actor.id,
      },
    })

    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_UPDATED",
      relatedEntityType: "Business",
      relatedEntityId: id,
      before: { name: existing.name },
      after: { name: updated.name },
      sourceChannel: "internal",
    })

    return updated
  })
}

// Hard delete, gated on having no negotiation history. Offer.businessId is
// required and NegotiationCase.businessId has no onDelete rule, so Postgres
// would reject the delete with a raw FK violation once either exists —
// this check exists to give the admin a clear reason instead of a Prisma
// P2003 error, and to steer them toward the existing TERMINATED
// verification status (which already exists for "this partnership is
// over" without destroying the case/offer records that reference it).
// Everything else on Business (categories, contacts, notes, agreements,
// invites) cascades at the schema level.
export async function deleteBusiness(id: string, reason: string, actor: Actor) {
  const existing = await prisma.business.findUniqueOrThrow({ where: { id } })

  const [caseCount, offerCount] = await Promise.all([
    prisma.negotiationCase.count({ where: { businessId: id } }),
    prisma.offer.count({ where: { businessId: id } }),
  ])
  if (caseCount > 0 || offerCount > 0) {
    throw new Error(
      "This business has negotiation history (cases or offers) and can't be deleted — use the Terminate verification status instead.",
    )
  }

  await prisma.$transaction(async (tx) => {
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_DELETED",
      relatedEntityType: "Business",
      relatedEntityId: id,
      before: { name: existing.name },
      after: { reason },
      sourceChannel: "internal",
    })
    await tx.business.delete({ where: { id } })
  })
}

// Any-to-any transition, no enforced state machine — matches the existing
// setCaseStatus precedent (docs/22 doesn't specify transition rules).
export async function setBusinessVerificationStatus(
  id: string,
  status: BusinessVerificationStatus,
  reasonCode: string | undefined,
  effectiveAt: Date | undefined,
  actor: Actor,
) {
  const existing = await prisma.business.findUniqueOrThrow({ where: { id } })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({
      where: { id },
      data: {
        verificationStatus: status,
        statusReasonCode: reasonCode,
        statusEffectiveAt: effectiveAt ?? new Date(),
        updatedBy: actor.id,
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_VERIFICATION_STATUS_CHANGED",
      relatedEntityType: "Business",
      relatedEntityId: id,
      before: { verificationStatus: existing.verificationStatus },
      after: { verificationStatus: status, reasonCode },
      sourceChannel: "internal",
    })
    return updated
  })
}

// Independent of verification status per docs/22 §5.2 — a verified
// business can still be held back from customer visibility.
export async function setBusinessPublishStatus(id: string, publishStatus: string, actor: Actor) {
  const existing = await prisma.business.findUniqueOrThrow({ where: { id } })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({ where: { id }, data: { publishStatus, updatedBy: actor.id } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_PUBLISH_STATUS_CHANGED",
      relatedEntityType: "Business",
      relatedEntityId: id,
      before: { publishStatus: existing.publishStatus },
      after: { publishStatus },
      sourceChannel: "internal",
    })
    return updated
  })
}

export type BusinessContactInput = { name: string; role?: string; email?: string; phone?: string; isPrimary?: boolean }

export async function addBusinessContact(businessId: string, input: BusinessContactInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const contact = await tx.businessContact.create({
      data: {
        businessId,
        name: input.name,
        role: input.role,
        email: input.email,
        phone: input.phone,
        isPrimary: input.isPrimary ?? false,
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_CONTACT_ADDED",
      relatedEntityType: "BusinessContact",
      relatedEntityId: contact.id,
      after: { name: contact.name, businessId },
      sourceChannel: "internal",
    })
    return contact
  })
}

export async function updateBusinessContact(
  contactId: string,
  input: Partial<BusinessContactInput>,
  actor: Actor,
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.businessContact.update({ where: { id: contactId }, data: input })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_CONTACT_UPDATED",
      relatedEntityType: "BusinessContact",
      relatedEntityId: contactId,
      after: { name: updated.name },
      sourceChannel: "internal",
    })
    return updated
  })
}

export async function removeBusinessContact(contactId: string, actor: Actor) {
  const existing = await prisma.businessContact.findUniqueOrThrow({ where: { id: contactId } })
  await prisma.$transaction(async (tx) => {
    await tx.businessContact.delete({ where: { id: contactId } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_CONTACT_REMOVED",
      relatedEntityType: "BusinessContact",
      relatedEntityId: contactId,
      before: { name: existing.name },
      sourceChannel: "internal",
    })
  })
}

export async function addBusinessNote(businessId: string, body: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.businessNote.create({ data: { businessId, authorId: actor.id, body } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "BUSINESS_NOTE_ADDED",
      relatedEntityType: "BusinessNote",
      relatedEntityId: note.id,
      sourceChannel: "internal",
    })
    return note
  })
}

export type PartnerAgreementInput = {
  agreementType: AgreementType
  effectiveDate: Date
  termEndDate?: Date
  autoRenew?: boolean
  negotiationAuthorityNotes?: string
  paymentTermsText?: string
  serviceLevelsText?: string
  terminationTermsText?: string
  confidentialityNotes?: string
}

// No Business.partnerAgreementId pointer — this always creates a new
// history row; "current" is whichever is most recent (see the businesses
// detail read path), mirroring the existing "latest offer" query pattern.
export async function createPartnerAgreement(businessId: string, input: PartnerAgreementInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.partnerAgreement.create({
      data: { businessId, ...input, createdBy: actor.id },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "PARTNER_AGREEMENT_CREATED",
      relatedEntityType: "PartnerAgreement",
      relatedEntityId: agreement.id,
      after: { businessId, agreementType: agreement.agreementType },
      sourceChannel: "internal",
    })
    return agreement
  })
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60)
}

// Read-only, computed via aggregates — nothing stored. "Response rate" and
// "avg response time" are computed from CaseBusinessInvite — a real
// business-responded event (docs/09 §4's "Partner response rate" /
// "Average response time") — rather than the offer-rate proxy this used
// before invites existed. Withdrawn invites are excluded from both: a
// Negotiator auto-withdrawing an invite (see offers.ts) isn't the business
// failing to respond.
export async function computeBusinessPerformanceSummary(businessId: string) {
  const [casesInvolvedCount, offersCount, acceptedOffersCount, disputedCasesCount, offersWithOriginal, invites] =
    await Promise.all([
      prisma.negotiationCase.count({ where: { businessId } }),
      prisma.offer.count({ where: { businessId } }),
      prisma.offer.count({ where: { businessId, customerDecision: "ACCEPTED" } }),
      prisma.negotiationCase.count({ where: { businessId, status: "DISPUTED" } }),
      prisma.offer.findMany({
        where: { businessId, originalValueCents: { not: null } },
        select: { originalValueCents: true, finalPriceCents: true },
      }),
      prisma.caseBusinessInvite.findMany({
        where: { businessId, status: { not: "WITHDRAWN" } },
        select: { createdAt: true, respondedAt: true },
      }),
    ])

  // Same "fetch rows, average in JS" approach as getPlatformAnalytics's
  // avgPriceImprovementCents — not a natural SQL aggregate via Prisma.
  const improvements = offersWithOriginal.map((o) => o.originalValueCents! - o.finalPriceCents)
  const avgValueCreated = improvements.length > 0 ? improvements.reduce((sum, v) => sum + v, 0) / improvements.length : null

  const respondedInvites = invites.filter((i) => i.respondedAt != null)
  const responseRate = invites.length > 0 ? respondedInvites.length / invites.length : null
  const avgResponseHours =
    respondedInvites.length > 0
      ? respondedInvites.reduce((sum, i) => sum + hoursBetween(i.createdAt, i.respondedAt!), 0) /
        respondedInvites.length
      : null

  return {
    casesInvolvedCount,
    offersCount,
    offerRate: casesInvolvedCount > 0 ? offersCount / casesInvolvedCount : null,
    acceptedOffersCount,
    acceptanceRate: offersCount > 0 ? acceptedOffersCount / offersCount : null,
    disputedCasesCount,
    avgValueCreated,
    invitesSentCount: invites.length,
    responseRate,
    avgResponseHours,
  }
}

export type BulkImportRow = {
  name: string
  description?: string
  category: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  city?: string
  country?: string
  verificationStatus?: string
}

export async function bulkImportBusinesses(rows: BulkImportRow[], actor: Actor) {
  const created: string[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (const [index, row] of rows.entries()) {
    try {
      if (!row.name || !row.category) {
        throw new Error("name and category are required")
      }
      const category = await prisma.category.findFirst({
        where: { name: { equals: row.category } },
      })
      if (!category) {
        throw new Error(`No category matching "${row.category}"`)
      }

      await prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            name: row.name,
            description: row.description,
            verificationStatus: (row.verificationStatus as BusinessVerificationStatus) || "PROSPECT",
            locations: row.city || row.country ? [{ city: row.city, country: row.country }] : undefined,
            createdBy: actor.id,
            updatedBy: actor.id,
            categories: { create: [{ categoryId: category.id }] },
            contacts: row.contactName
              ? { create: [{ name: row.contactName, email: row.contactEmail, phone: row.contactPhone, isPrimary: true }] }
              : undefined,
          },
        })
        await recordAudit(tx, {
          actorType: "ADMIN",
          actorId: actor.id,
          action: "BUSINESS_CREATED",
          relatedEntityType: "Business",
          relatedEntityId: business.id,
          after: { name: business.name, source: "bulk_import" },
          sourceChannel: "internal",
        })
        created.push(business.id)
      })
    } catch (error) {
      errors.push({ row: index + 1, error: (error as Error).message })
    }
  }

  await recordAudit(prisma, {
    actorType: "ADMIN",
    actorId: actor.id,
    action: "BUSINESS_BULK_IMPORT_COMPLETED",
    after: { createdCount: created.length, errorCount: errors.length },
    sourceChannel: "internal",
  })

  return { created, errors }
}
