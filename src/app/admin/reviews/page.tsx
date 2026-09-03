import Link from "next/link"
import { prisma } from "@/server/db"
import { listReviews } from "@/server/services/reviews"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ negotiatorId?: string }>
}) {
  const { negotiatorId } = await searchParams

  const [reviews, filteredNegotiator] = await Promise.all([
    listReviews(negotiatorId ? { negotiatorId } : undefined),
    negotiatorId ? prisma.negotiator.findUnique({ where: { id: negotiatorId }, select: { name: true } }) : null,
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Reviews</h1>
      <p className="text-sm text-ink-muted">Post-closure customer feedback, across every case that's answered it.</p>

      {negotiatorId && (
        <Link href="/admin/reviews">
          <Badge variant="cobalt">{filteredNegotiator?.name ?? "This negotiator"} only ✕</Badge>
        </Link>
      )}

      <Card className="p-0 overflow-hidden">
        {reviews.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No reviews yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Negotiator</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Saved money / improved deal / would use again</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/cases/${r.case.id}`} className="block px-4 py-3">
                      <p className="font-bold text-sm">
                        {r.case.publicRef} · {r.case.categoryName}
                      </p>
                      <p className="text-xs text-ink-muted">{new Date(r.submittedAt).toLocaleDateString()}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link
                      href={r.negotiatorId ? `/admin/reviews?negotiatorId=${r.negotiatorId}` : `/admin/cases/${r.case.id}`}
                      className="block px-4 py-3 text-sm text-ink-muted"
                    >
                      {r.negotiatorName ?? "Unassigned"}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases/${r.case.id}`} className="block px-4 py-3 text-sm font-bold">
                      {r.negotiatorRating != null ? `${r.negotiatorRating} / 5` : "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases/${r.case.id}`} className="flex items-center justify-end gap-1 px-4 py-3">
                      <Badge variant={r.savedMoney ? "cobalt" : "outline"}>{r.savedMoney ? "Saved" : "No"}</Badge>
                      <Badge variant={r.improvedDeal ? "cobalt" : "outline"}>{r.improvedDeal ? "Improved" : "No"}</Badge>
                      <Badge variant={r.wouldUseAgain ? "cobalt" : "outline"}>
                        {r.wouldUseAgain ? "Would return" : "No"}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
