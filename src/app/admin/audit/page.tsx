import Link from "next/link"
import { prisma } from "@/server/db"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AuditFilters from "@/app/admin/audit/filters"
import type { ActorType, Prisma } from "@prisma/client"

const PAGE_SIZE = 50

// First cursor-paginated list in the app — every other list today uses a
// hard `take: N` with no "load more". AuditLog can grow unbounded, so a
// hard cap isn't acceptable here the way it is elsewhere.
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actorType?: string
    action?: string
    sourceChannel?: string
    from?: string
    to?: string
    q?: string
    cursor?: string
  }>
}) {
  const { actorType, action, sourceChannel, from, to, q, cursor } = await searchParams

  const where: Prisma.AuditLogWhereInput = {}
  if (actorType) where.actorType = actorType as ActorType
  if (sourceChannel) where.sourceChannel = sourceChannel
  if (action) where.action = { contains: action, mode: "insensitive" }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    }
  }
  if (q) {
    where.OR = [
      { relatedEntityType: { contains: q, mode: "insensitive" } },
      { relatedEntityId: { contains: q, mode: "insensitive" } },
    ]
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { case: { select: { publicRef: true } } },
  })

  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? page[page.length - 1]?.id : null

  const currentQuery = { actorType, action, sourceChannel, from, to, q }
  const nextQuery = new URLSearchParams(
    Object.entries(currentQuery).filter(([, v]) => v) as [string, string][],
  )
  if (nextCursor) nextQuery.set("cursor", nextCursor)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Audit log</h1>
      <AuditFilters current={currentQuery} />

      <Card className="p-0 overflow-hidden">
        {page.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No audit rows match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="text-right">Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-ink-muted">{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-bold">{row.action}</TableCell>
                  <TableCell className="text-sm text-ink-muted">
                    {row.actorType} ({row.sourceChannel})
                  </TableCell>
                  <TableCell className="text-right text-xs text-ink-muted">
                    {row.case ? (
                      <Link href={`/admin/cases/${row.caseId}`} className="underline text-cobalt-600">
                        {row.case.publicRef}
                      </Link>
                    ) : row.relatedEntityType ? (
                      `${row.relatedEntityType} · ${row.relatedEntityId ?? "—"}`
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {nextCursor && (
        <div className="flex justify-end">
          <Link href={`/admin/audit?${nextQuery.toString()}`} className="text-sm font-bold text-cobalt-600 underline">
            Next page
          </Link>
        </div>
      )}
    </div>
  )
}
