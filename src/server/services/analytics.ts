import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db"
import { isTerminal } from "@/server/services/cases"

// Basic analytics per docs/16_MEASUREMENT_ANALYTICS.md — only the metrics
// honestly computable from data this platform already collects. Explicitly
// NOT included (flagged, not silently dropped — CLAUDE.md rule 6): all of
// §5 Financial Metrics (need Transaction/Payment, Phase 3), referral rate
// (needs a referral/attribution mechanism that was never built), and most
// of §6 Quality Metrics (documentation completeness, unauthorized
// commitments, complaints — no tracking mechanism exists for any of
// these). Customer satisfaction *is* now trackable, via the post-closure
// Feedback flow (docs/03 §12, src/server/services/feedback.ts). Escalations
// (§6) and partner retention (§4) are also now trackable — escalated is a
// real field on NegotiationCase, and retention is approximated as "has
// cases in more than one distinct calendar month," the same cohort-style
// proxy repeatRequestRate below already uses for customers.
//
// Duration/rounds/price-improvement aren't natural SQL aggregates against
// SQLite via Prisma, so those fetch the relevant rows and average in JS —
// same pattern as computeBusinessPerformanceSummary in businesses.ts.

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

function rateOf(values: (boolean | null)[]): number | null {
  const answered = values.filter((v): v is boolean => v !== null)
  return answered.length > 0 ? answered.filter(Boolean).length / answered.length : null
}

// Shared by getPlatformAnalytics (no filter) and getNegotiatorAnalytics
// (scoped to one negotiatorId) — a Feedback row exists from the moment the
// token is issued at closure (see feedback.ts), so `issued` counts every
// case that reached closure while `submitted` counts only the ones a
// customer actually answered; the ratio is the response rate.
async function feedbackSummary(where: Prisma.FeedbackWhereInput) {
  const [issued, submitted] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where: { ...where, submittedAt: { not: null } },
      select: { savedMoney: true, improvedDeal: true, negotiatorRating: true, wouldUseAgain: true },
    }),
  ])

  return {
    feedbackResponseRate: issued > 0 ? submitted.length / issued : null,
    avgNegotiatorRating: average(
      submitted.map((f) => f.negotiatorRating).filter((r): r is number => r !== null),
    ),
    savedMoneyRate: rateOf(submitted.map((f) => f.savedMoney)),
    improvedDealRate: rateOf(submitted.map((f) => f.improvedDeal)),
    wouldUseAgainRate: rateOf(submitted.map((f) => f.wouldUseAgain)),
  }
}

export async function getPlatformAnalytics() {
  const [
    requestsSubmitted,
    requestsQualified,
    decidedOffers,
    acceptedOffers,
    totalOffers,
    activePartners,
    disputedCases,
    escalatedCases,
  ] = await Promise.all([
    prisma.negotiationCase.count(),
    // "Qualified" isn't a CaseStatus value — interpreted as "reached a
    // Negotiator," i.e. assigned.
    prisma.negotiationCase.count({ where: { assignedNegotiatorId: { not: null } } }),
    prisma.offer.count({ where: { customerDecision: { not: null } } }),
    prisma.offer.count({ where: { customerDecision: "ACCEPTED" } }),
    prisma.offer.count(),
    prisma.business.count({ where: { verificationStatus: "ACTIVE" } }),
    prisma.negotiationCase.count({ where: { status: "DISPUTED" } }),
    prisma.negotiationCase.count({ where: { escalated: true } }),
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

  // Same cohort-style proxy as repeatRequestRate above: a business "retained"
  // if it has cases spanning more than one distinct calendar month, rather
  // than a single burst of activity.
  const casesWithBusiness = await prisma.negotiationCase.findMany({
    where: { businessId: { not: null } },
    select: { businessId: true, createdAt: true },
  })
  const monthsByBusiness = new Map<string, Set<string>>()
  for (const c of casesWithBusiness) {
    const monthKey = `${c.createdAt.getFullYear()}-${c.createdAt.getMonth()}`
    const months = monthsByBusiness.get(c.businessId!) ?? new Set<string>()
    months.add(monthKey)
    monthsByBusiness.set(c.businessId!, months)
  }
  const partnerRetentionRate =
    monthsByBusiness.size > 0
      ? Array.from(monthsByBusiness.values()).filter((months) => months.size > 1).length / monthsByBusiness.size
      : null

  const feedback = await feedbackSummary({})

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
    escalationRate: requestsSubmitted > 0 ? escalatedCases / requestsSubmitted : null,
    partnerRetentionRate,
    closedDealsCount,
    totalDealValueCents,
    avgDealValueCents,
    ...feedback,
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

  const feedback = await feedbackSummary({ negotiatorId })

  return {
    totalCases,
    casesByStatus: casesByStatus.map((g) => ({ status: g.status, count: g._count._all })),
    acceptanceRate: decidedOffers > 0 ? acceptedOffers / decidedOffers : null,
    avgNegotiationDurationHours,
    avgRoundsPerCase,
    ...feedback,
  }
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60)
}

// Per-negotiator workload summary for Admin oversight (docs/09's "Negotiators"
// core area) — casesPerNegotiator on getPlatformAnalytics only counts total
// assigned cases for negotiators who have any; this covers every negotiator
// (including inactive ones and ones with zero cases), splits open vs. total,
// and surfaces escalation/rating signals useful for balancing workload.
export async function getNegotiatorWorkloads() {
  const negotiators = await prisma.negotiator.findMany({ orderBy: { name: "asc" } })

  const [caseGroups, escalatedGroups, feedbackRows] = await Promise.all([
    prisma.negotiationCase.groupBy({
      by: ["assignedNegotiatorId", "status"],
      _count: { _all: true },
      where: { assignedNegotiatorId: { not: null } },
    }),
    prisma.negotiationCase.groupBy({
      by: ["assignedNegotiatorId"],
      _count: { _all: true },
      where: { assignedNegotiatorId: { not: null }, escalated: true },
    }),
    prisma.feedback.findMany({
      where: { negotiatorId: { not: null }, submittedAt: { not: null } },
      select: { negotiatorId: true, negotiatorRating: true },
    }),
  ])

  const workloads = negotiators.map((negotiator) => {
    const statusCounts = caseGroups.filter((g) => g.assignedNegotiatorId === negotiator.id)
    const totalCaseCount = statusCounts.reduce((sum, g) => sum + g._count._all, 0)
    const openCaseCount = statusCounts
      .filter((g) => !isTerminal(g.status))
      .reduce((sum, g) => sum + g._count._all, 0)
    const escalatedCount = escalatedGroups.find((g) => g.assignedNegotiatorId === negotiator.id)?._count._all ?? 0
    const ratings = feedbackRows
      .filter((f) => f.negotiatorId === negotiator.id)
      .map((f) => f.negotiatorRating)
      .filter((r): r is number => r !== null)

    return {
      id: negotiator.id,
      name: negotiator.name,
      email: negotiator.email,
      active: negotiator.active,
      totalCaseCount,
      openCaseCount,
      escalatedCount,
      avgRating: average(ratings),
    }
  })

  return workloads.sort((a, b) => b.openCaseCount - a.openCaseCount)
}
