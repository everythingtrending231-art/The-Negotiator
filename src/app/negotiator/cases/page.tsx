import Link from "next/link"
import { prisma } from "@/server/db"
import type { CaseStatus } from "@prisma/client"
import { CaseStatus as CaseStatusEnum } from "@prisma/client"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"
import { cn } from "@/lib/utils"

// A smaller set of quick filters up top for the common views, with the
// full 15-value status vocabulary tucked into "More statuses" below it —
// replaces a single flat row of 16 pills competing for attention equally.
const QUICK_FILTERS: CaseStatus[] = [
  CaseStatusEnum.NEGOTIATING,
  CaseStatusEnum.AWAITING_BUSINESS,
  CaseStatusEnum.AWAITING_CUSTOMER,
  CaseStatusEnum.OFFER_READY,
]

function FilterPill({
  value,
  label,
  active,
}: {
  value?: CaseStatus
  label: string
  active: boolean
}) {
  return (
    <Link
      href={value ? `/negotiator/cases?status=${value}` : "/negotiator/cases"}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-bold border transition-colors",
        active
          ? "bg-cobalt-600 border-cobalt-600 text-white"
          : "bg-white border-border text-ink-muted hover:border-cobalt-300 hover:text-cobalt-600"
      )}
    >
      {label}
    </Link>
  )
}

export default async function NegotiatorCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filterStatus = status && status in CaseStatusEnum ? (status as CaseStatus) : undefined

  const cases = await prisma.negotiationCase.findMany({
    where: filterStatus ? { status: filterStatus } : undefined,
    orderBy: { createdAt: "desc" },
    include: { category: true, assignedNegotiator: true, ticket: true },
    take: 100,
  })

  const allStatuses = Object.values(CaseStatusEnum)
  const otherStatuses = allStatuses.filter((s) => !QUICK_FILTERS.includes(s))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-cobalt-600">Cases</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FilterPill label="All" active={!filterStatus} />
        {QUICK_FILTERS.map((value) => (
          <FilterPill key={value} value={value} label={statusLabel(value)} active={filterStatus === value} />
        ))}
      </div>

      <details className="mb-6 group">
        <summary className="text-xs font-bold text-ink-muted cursor-pointer hover:text-cobalt-600 select-none">
          More statuses
        </summary>
        <div className="flex flex-wrap gap-2 mt-2">
          {otherStatuses.map((value) => (
            <FilterPill key={value} value={value} label={statusLabel(value)} active={filterStatus === value} />
          ))}
        </div>
      </details>

      <Card className="p-0 overflow-hidden">
        {cases.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">
            No cases {filterStatus ? `in ${statusLabel(filterStatus)}` : "yet"}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Category · customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Negotiator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((negotiationCase) => (
                <TableRow key={negotiationCase.id} className="cursor-pointer">
                  <TableCell className="p-0">
                    <Link href={`/negotiator/cases/${negotiationCase.id}`} className="block px-4 py-3 font-bold text-ink">
                      {negotiationCase.publicRef}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link
                      href={`/negotiator/cases/${negotiationCase.id}`}
                      className="block px-4 py-3 text-sm text-ink-muted"
                    >
                      {negotiationCase.category.name} · {negotiationCase.ticket?.customerEmail}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link href={`/negotiator/cases/${negotiationCase.id}`} className="block px-4 py-3">
                      <StatusBadge status={negotiationCase.status} />
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link
                      href={`/negotiator/cases/${negotiationCase.id}`}
                      className="block px-4 py-3 text-xs text-ink-muted"
                    >
                      {negotiationCase.assignedNegotiator?.name ?? "Unassigned"}
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
