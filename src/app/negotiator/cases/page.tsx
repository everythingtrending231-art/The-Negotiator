import Link from "next/link"
import { prisma } from "@/server/db"
import type { CaseStatus } from "@prisma/client"
import { CaseStatus as CaseStatusEnum } from "@prisma/client"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"
import { cn } from "@/lib/utils"
import CaseSearchInput from "@/components/case-search-input"
import type { Prisma } from "@prisma/client"

// A smaller set of quick filters up top for the common views, with the
// full 15-value status vocabulary tucked into "More statuses" below it —
// replaces a single flat row of 16 pills competing for attention equally.
const QUICK_FILTERS: CaseStatus[] = [
  CaseStatusEnum.NEGOTIATING,
  CaseStatusEnum.AWAITING_BUSINESS,
  CaseStatusEnum.AWAITING_CUSTOMER,
  CaseStatusEnum.OFFER_READY,
]

// Excludes fully-closed cases from the Work Queue — mirrors cases.ts's
// TERMINAL_STATUSES (COMPLETED/DISPUTED are deliberately not terminal
// there either, since a negotiator still has to act on them).
const CLOSED_STATUSES: CaseStatus[] = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CLOSED"]

const EXPIRING_WINDOW_MS = 48 * 60 * 60 * 1000

function FilterPill({
  value,
  label,
  active,
  q,
}: {
  value?: CaseStatus
  label: string
  active: boolean
  q?: string
}) {
  const params = new URLSearchParams()
  if (value) params.set("status", value)
  if (q?.trim()) params.set("q", q.trim())
  const query = params.toString()

  return (
    <Link
      href={query ? `/negotiator/cases?${query}` : "/negotiator/cases"}
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

type QueueCase = {
  id: string
  publicRef: string
  status: CaseStatus
  escalated: boolean
  category: { name: string }
  assignedNegotiator: { name: string } | null
  ticket: { customerEmail: string } | null
  offers: { status: string; validUntil: Date | null; customerDecision: string | null }[]
}

function QueueGroupHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">{title}</h2>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill text-xs font-bold bg-amber-500 text-ink">
          {count}
        </span>
      )}
    </div>
  )
}

function QueueGroup({ title, cases, highlight }: { title: string; cases: QueueCase[]; highlight?: boolean }) {
  if (cases.length === 0) return null
  return (
    <div>
      <QueueGroupHeading title={title} count={cases.length} />
      <Card className={cn("p-0 overflow-hidden divide-y divide-border", highlight && "border-l-4 border-l-amber-500")}>
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/negotiator/cases/${c.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-cream-200"
          >
            <div>
              <p className="font-bold text-sm">{c.publicRef}</p>
              <p className="text-xs text-ink-muted">
                {c.category.name} · {c.ticket?.customerEmail}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {c.escalated && <StatusBadge status="DISPUTED" label="Escalated" />}
              <StatusBadge status={c.status} />
            </div>
          </Link>
        ))}
      </Card>
    </div>
  )
}

export default async function NegotiatorCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const filterStatus = status && status in CaseStatusEnum ? (status as CaseStatus) : undefined

  const listWhere: Prisma.NegotiationCaseWhereInput = {}
  if (filterStatus) listWhere.status = filterStatus
  if (q?.trim()) {
    const query = q.trim()
    listWhere.OR = [
      { publicRef: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { ticket: { customerEmail: { contains: query, mode: "insensitive" } } },
    ]
  }

  const [cases, queueCases] = await Promise.all([
    prisma.negotiationCase.findMany({
      where: listWhere,
      orderBy: { createdAt: "desc" },
      include: { category: true, assignedNegotiator: true, ticket: true },
      take: 100,
    }),
    prisma.negotiationCase.findMany({
      where: { status: { notIn: CLOSED_STATUSES } },
      orderBy: { updatedAt: "desc" },
      include: {
        category: true,
        assignedNegotiator: true,
        ticket: true,
        offers: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, validUntil: true, customerDecision: true } },
      },
      take: 200,
    }),
  ])

  const now = Date.now()
  const newCases = queueCases.filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW")
  const assignedCases = queueCases.filter((c) => c.status === "ASSIGNED" || c.status === "NEGOTIATING")
  const awaitingBusiness = queueCases.filter((c) => c.status === "AWAITING_BUSINESS")
  const awaitingCustomer = queueCases.filter((c) => c.status === "AWAITING_CUSTOMER" || c.status === "OFFER_READY")
  const expiringOffers = queueCases.filter((c) => {
    const offer = c.offers[0]
    if (!offer || offer.status !== "PRESENTED" || offer.customerDecision || !offer.validUntil) return false
    const msUntilExpiry = new Date(offer.validUntil).getTime() - now
    return msUntilExpiry > 0 && msUntilExpiry <= EXPIRING_WINDOW_MS
  })
  const escalatedCases = queueCases.filter((c) => c.escalated)

  const hasQueueContent =
    newCases.length + assignedCases.length + awaitingBusiness.length + awaitingCustomer.length + expiringOffers.length + escalatedCases.length >
    0

  const allStatuses = Object.values(CaseStatusEnum)
  const otherStatuses = allStatuses.filter((s) => !QUICK_FILTERS.includes(s))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600 mb-6">Work queue</h1>
        {hasQueueContent ? (
          <div className="space-y-6">
            <QueueGroup title="Escalated" cases={escalatedCases} highlight />
            <QueueGroup title="Expiring offers" cases={expiringOffers} highlight />
            <QueueGroup title="New" cases={newCases} />
            <QueueGroup title="Assigned" cases={assignedCases} />
            <QueueGroup title="Awaiting business" cases={awaitingBusiness} />
            <QueueGroup title="Awaiting customer" cases={awaitingCustomer} />
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Nothing needs attention right now.</p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-black text-cobalt-600 mb-4">All cases</h2>

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <CaseSearchInput placeholder="Search by case number, email, or description…" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <FilterPill label="All" active={!filterStatus} q={q} />
          {QUICK_FILTERS.map((value) => (
            <FilterPill key={value} value={value} label={statusLabel(value)} active={filterStatus === value} q={q} />
          ))}
        </div>

        <details className="mb-6 group">
          <summary className="text-xs font-bold text-ink-muted cursor-pointer hover:text-cobalt-600 select-none">
            More statuses
          </summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {otherStatuses.map((value) => (
              <FilterPill key={value} value={value} label={statusLabel(value)} active={filterStatus === value} q={q} />
            ))}
          </div>
        </details>

        <Card className="p-0 overflow-hidden">
          {cases.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted">
              No cases {filterStatus ? `in ${statusLabel(filterStatus)}` : "yet"}
              {q?.trim() ? ` matching "${q.trim()}"` : ""}.
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
    </div>
  )
}
