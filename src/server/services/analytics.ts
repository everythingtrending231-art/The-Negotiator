import { prisma } from "@/server/db"

// Basic analytics per docs/16_MEASUREMENT_ANALYTICS.md — only the metrics
// honestly computable from data this platform already collects. Explicitly
// NOT included (flagged, not silently dropped — CLAUDE.md rule 6): all of
// §5 Financial Metrics (need Transaction/Payment, Phase 3), customer
// satisfaction/referral rate/partner retention (need review/referral/
// cohort tracking that was never built), and §6 Quality Metrics
// (documentation completeness, unauthorized commitments, complaints,
// escalations — no tracking mechanism exists for any of these).
//
// Duration/rounds/price-improvement aren't natural SQL aggregates against
// SQLite via Prisma, so those fetch the relevant rows and average in JS —
// same pattern as computeBusinessPerformanceSummary in businesses.ts.

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

export async function getPlatformAnalytics() {
  const [requestsSubmitted, requestsQualified, decidedOffers, acceptedOffers, totalOffers, activePartners, disputedCases] =
    await Promise.all([
      prisma.negotiationCase.count(),
      // "Qualified" isn't a CaseStatus value — interpreted as "reached a
      // Negotiator," i.e. assigned.
      prisma.negotiationCase.count({ where: { assignedNegotiatorId: { not: null } } }),
      prisma.offer.count({ where: { customerDecision: { not: null } } }),
      prisma.offer.count({ where: { customerDecision: "ACCEPTED" } }),
      prisma.offer.count(),
      prisma.business.count({ where: { verificationStatus: "ACTIVE" } }),
      prisma.negotiationCase.count({ where: { status: "DISPUTED" } }),
    ])

  const emailGroups = await prisma.negotiationTicket.groupBy({
    by: ["customerEmail"],
    _count: { _all: true },
  })
  const repeatRequestRate =
    emailGroups.length > 0 ? emailGroups.filter((g) => g._count._all > 1).length / emailGroups.length : null

  const offerCaseIds = await prisma.offer.findMany({ select: { caseId: true }, distinct: ["caseId"] })
  const offerRate = requestsQualified > 0 ? offerCaseIds.length / requestsQualified : null

  const changeRequestRows = await prisma.auditLog.findMany({
    where: { action: "OFFER_CHANGES_REQUESTED" },
    select: { relatedEntityId: true },
    distinct: ["relatedEntityId"],
  })
  const counterofferRate = totalOffers > 0 ? changeRequestRows.length / totalOffers : null

  const negotiatorGroups = await prisma.negotiationCase.groupBy({
    by: ["assignedNegotiatorId"],
    _count: { _all: true },
    where: { assignedNegotiatorId: { not: null } },
  })
  const negotiators = await prisma.negotiator.findMany({
    where: { id: { in: negotiatorGroups.map((g) => g.assignedNegotiatorId!) } },
  })
  const casesPerNegotiator = negotiatorGroups
    .map((g) => ({
      negotiatorId: g.assignedNegotiatorId!,
      negotiatorName: negotiators.find((n) => n.id === g.assignedNegotiatorId)?.name ?? "Unknown",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)

  const closedCases = await prisma.negotiationCase.findMany({
    where: { ticket: { closedAt: { not: null } } },
    select: { createdAt: true, ticket: { select: { closedAt: true } } },
  })
  const avgNegotiationDurationHours = average(
    closedCases.filter((c) => c.ticket?.closedAt).map((c) => hoursBetween(c.createdAt, c.ticket!.closedAt!)),
  )

  const offersByCase = await prisma.offer.groupBy({ by: ["caseId"], _count: { _all: true } })
  const avgRoundsPerCase = average(offersByCase.map((g) => g._count._all))

  const offersWithOriginal = await prisma.offer.findMany({
    where: { originalValueCents: { not: null } },
    select: { originalValueCents: true, finalPriceCents: true },
  })
  const avgPriceImprovementCents = average(
    offersWithOriginal.map((o) => o.originalValueCents! - o.finalPriceCents),
  )

  const confirmedOffers = await prisma.offer.findMany({
    where: { businessConfirmedAt: { not: null } },
    select: { createdAt: true, businessConfirmedAt: true },
  })
  const avgBusinessConfirmationHours = average(
    confirmedOffers.map((o) => hoursBetween(o.createdAt, o.businessConfirmedAt!)),
  )

  // Phase 3 scaffolding: deal-VALUE reporting, not revenue — no fee/pricing
  // model exists yet (docs/21_OPEN_DECISIONS.md has every payment mechanic
  // marked TBD, per CLAUDE.md rule 6). This is the total/average size of
  // offers customers accepted, nothing about what the platform earns.
  // Assumes a single implicit currency across offers, same simplification
  // avgPriceImprovementCents above already makes. acceptedOffers (the
  // count fetched above) is reused directly as closedDealsCount.
  const acceptedOfferValues = await prisma.offer.findMany({
    where: { customerDecision: "ACCEPTED" },
    select: { finalPriceCents: true },
  })
  const closedDealsCount = acceptedOffers
  const totalDealValueCents = acceptedOfferValues.reduce((sum, o) => sum + o.finalPriceCents, 0)
  const avgDealValueCents = closedDealsCount > 0 ? totalDealValueCents / closedDealsCount : null

  return {
    requestsSubmitted,
    requestsQualified,
    repeatRequestRate,
    acceptanceRate: decidedOffers > 0 ? acceptedOffers / decidedOffers : null,
    casesPerNegotiator,
    avgNegotiationDurationHours,
    offerRate,
    counterofferRate,
    avgRoundsPerCase,
    avgPriceImprovementCents,
    activePartners,
    avgBusinessConfirmationHours,
    disputeRate: requestsSubmitted > 0 ? disputedCases / requestsSubmitted : null,
    closedDealsCount,
    totalDealValueCents,
    avgDealValueCents,
  }
}

export async function getNegotiatorAnalytics(negotiatorId: string) {
  const casesByStatus = await prisma.negotiationCase.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { assignedNegotiatorId: negotiatorId },
  })
  const totalCases = casesByStatus.reduce((sum, g) => sum + g._count._all, 0)

  const [decidedOffers, acceptedOffers] = await Promise.all([
    prisma.offer.count({ where: { negotiatorId, customerDecision: { not: null } } }),
    prisma.offer.count({ where: { negotiatorId, customerDecision: "ACCEPTED" } }),
  ])

  const closedCases = await prisma.negotiationCase.findMany({
    where: { assignedNegotiatorId: negotiatorId, ticket: { closedAt: { not: null } } },
    select: { createdAt: true, ticket: { select: { closedAt: true } } },
  })
  const avgNegotiationDurationHours = average(
    closedCases.filter((c) => c.ticket?.closedAt).map((c) => hoursBetween(c.createdAt, c.ticket!.closedAt!)),
  )

  const offersByCase = await prisma.offer.groupBy({
    by: ["caseId"],
    _count: { _all: true },
    where: { negotiatorId },
  })
  const avgRoundsPerCase = average(offersByCase.map((g) => g._count._all))

  return {
    totalCases,
    casesByStatus: casesByStatus.map((g) => ({ status: g.status, count: g._count._all })),
    acceptanceRate: decidedOffers > 0 ? acceptedOffers / decidedOffers : null,
    avgNegotiationDurationHours,
    avgRoundsPerCase,
  }
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60)
}
