import { prisma } from "@/server/db"

export type ReviewListItem = {
  id: string
  submittedAt: Date
  savedMoney: boolean | null
  improvedDeal: boolean | null
  negotiatorRating: number | null
  wouldUseAgain: boolean | null
  negotiatorId: string | null
  negotiatorName: string | null
  case: { id: string; publicRef: string; categoryName: string }
}

// docs/09_ADMIN_BUSINESS_CUSTOMER_PORTALS.md lists "Reviews" as its own
// Admin Portal core area, distinct from the per-case Feedback tab and the
// negotiator-level avgRating in getNegotiatorWorkloads — this is the
// browsable list across every submitted review those two only summarize.
export async function listReviews(filter?: { negotiatorId?: string }): Promise<ReviewListItem[]> {
  const feedback = await prisma.feedback.findMany({
    where: {
      submittedAt: { not: null },
      ...(filter?.negotiatorId ? { negotiatorId: filter.negotiatorId } : {}),
    },
    orderBy: { submittedAt: "desc" },
    include: { negotiator: true, case: { include: { category: true } } },
  })

  return feedback.map((f) => ({
    id: f.id,
    submittedAt: f.submittedAt!,
    savedMoney: f.savedMoney,
    improvedDeal: f.improvedDeal,
    negotiatorRating: f.negotiatorRating,
    wouldUseAgain: f.wouldUseAgain,
    negotiatorId: f.negotiatorId,
    negotiatorName: f.negotiator?.name ?? null,
    case: { id: f.case.id, publicRef: f.case.publicRef, categoryName: f.case.category.name },
  }))
}
