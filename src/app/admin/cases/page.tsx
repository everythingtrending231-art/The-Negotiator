import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"
import CaseStatusFilter from "@/app/admin/cases/status-filter"
import CaseSearchInput from "@/components/case-search-input"
import type { CaseStatus, Prisma } from "@prisma/client"

// Admin had no per-case visibility before this PR — only aggregate
// analytics. Read-only list; override actions (reassign, force-close) live
// on the detail page.
export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; escalated?: string; q?: string; negotiatorId?: string }>
}) {
  const { status, escalated, q, negotiatorId } = await searchParams

  const where: Prisma.NegotiationCaseWhereInput = {}
  if (status) where.status = status as CaseStatus
  if (escalated === "1") where.escalated = true
  if (negotiatorId) where.assignedNegotiatorId = negotiatorId
  if (q?.trim()) {
    const query = q.trim()
    where.OR = [
      { publicRef: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { ticket: { customerEmail: { contains: query, mode: "insensitive" } } },
    ]
  }

  const [cases, filteredNegotiator] = await Promise.all([
    prisma.negotiationCase.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { category: true, business: true, assignedNegotiator: true },
    }),
    negotiatorId ? prisma.negotiator.findUnique({ where: { id: negotiatorId }, select: { name: true } }) : null,
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Cases</h1>

      <div className="flex flex-wrap items-center gap-3">
        <CaseSearchInput placeholder="Search by case number, email, or description…" />
        <CaseStatusFilter current={status} />
        <Link
          href={{
            pathname: "/admin/cases",
            query: {
              ...(status ? { status } : {}),
              ...(q?.trim() ? { q: q.trim() } : {}),
              ...(negotiatorId ? { negotiatorId } : {}),
              escalated: escalated === "1" ? undefined : "1",
            },
          }}
        >
          <Badge variant={escalated === "1" ? "danger" : "outline"}>Escalated only</Badge>
        </Link>
        {negotiatorId && (
          <Link
            href={{
              pathname: "/admin/cases",
              query: {
                ...(status ? { status } : {}),
                ...(q?.trim() ? { q: q.trim() } : {}),
                ...(escalated === "1" ? { escalated: "1" } : {}),
              },
            }}
          >
            <Badge variant="cobalt">{filteredNegotiator?.name ?? "This negotiator"} only ✕</Badge>
          </Link>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {cases.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No cases match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Negotiator</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/cases/${c.id}`} className="block px-4 py-3">
                      <p className="font-bold text-sm">
                        {c.publicRef} · {c.category.name}
                      </p>
                      <p className="text-xs text-ink-muted">{c.business?.name ?? "No business yet"}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link href={`/admin/cases/${c.id}`} className="block px-4 py-3 text-sm text-ink-muted">
                      {c.assignedNegotiator?.name ?? "Unassigned"}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases/${c.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
                      {c.escalated && <Badge variant="danger">Escalated</Badge>}
                      <StatusBadge status={c.status} />
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
