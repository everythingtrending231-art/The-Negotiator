import Link from "next/link"
import { prisma } from "@/server/db"
import type { Prisma } from "@prisma/client"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { formatCents } from "@/lib/money"
import { Card } from "@/components/ui/card"
import StatusBadge from "@/components/status-badge"
import { cn } from "@/lib/utils"
import CaseSearchInput from "@/components/case-search-input"

const TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "COMPLETED", "DISPUTED", "CLOSED"]

export default async function BusinessCasesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)
  const { q } = await searchParams

  // No customer-email search here — a business never sees the customer's
  // email (same visibility boundary as the case-detail page), so search is
  // limited to what's already shown: the case number and its category.
  const query = q?.trim()
  const caseTextFilter: Prisma.NegotiationCaseWhereInput[] = query
    ? [
        { publicRef: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ]
    : []

  const [cases, invites] = await Promise.all([
    prisma.negotiationCase.findMany({
      where: { businessId: contact.businessId, ...(query ? { OR: caseTextFilter } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { category: true, offers: { orderBy: { createdAt: "desc" }, take: 1 } },
      take: 100,
    }),
    prisma.caseBusinessInvite.findMany({
      where: {
        businessId: contact.businessId,
        ...(query
          ? {
              OR: [
                { case: { publicRef: { contains: query, mode: "insensitive" } } },
                { case: { category: { name: { contains: query, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { case: { include: { category: true } } },
      take: 100,
    }),
  ])

  const newRequests = invites.filter((i) => i.status === "PENDING")
  const notPursued = invites.filter((i) => i.status === "DECLINED" || i.status === "WITHDRAWN")
  const awaitingConfirmation = cases.filter((c) => c.status === "AWAITING_BUSINESS")
  const active = cases.filter((c) => c.status !== "AWAITING_BUSINESS" && !TERMINAL_STATUSES.includes(c.status))
  const closed = cases.filter((c) => TERMINAL_STATUSES.includes(c.status))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-cobalt-600">Cases</h1>
        <CaseSearchInput placeholder="Search by case number or category…" />
      </div>

      <InviteGroup title="New requests" invites={newRequests} highlight />
      <CaseGroup title="Awaiting your confirmation" cases={awaitingConfirmation} highlight />
      <CaseGroup title="Active" cases={active} />
      <CaseGroup title="Closed / deal history" cases={closed} />
      <InviteGroup title="Not pursued" invites={notPursued} muted />
    </div>
  )
}

type CaseRow = {
  id: string
  publicRef: string
  status: string
  category: { name: string }
  offers: { finalPriceCents: number; currency: string }[]
}

type InviteRow = {
  id: string
  status: string
  caseId: string
  case: { publicRef: string; category: { name: string } }
}

function GroupHeading({ title, count, highlight }: { title: string; count: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">{title}</h2>
      {highlight && count > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill text-xs font-bold bg-amber-500 text-ink">
          {count}
        </span>
      )}
    </div>
  )
}

// "Action needed" buckets (new requests, awaiting your confirmation) get a
// left amber accent so they read as distinct from the passive history
// buckets below them instead of all five sections looking identical.
function GroupCard({ highlight, children }: { highlight?: boolean; children: React.ReactNode }) {
  return (
    <Card className={cn("p-0 overflow-hidden divide-y divide-border", highlight && "border-l-4 border-l-amber-500")}>
      {children}
    </Card>
  )
}

function CaseGroup({ title, cases, highlight }: { title: string; cases: CaseRow[]; highlight?: boolean }) {
  return (
    <div>
      <GroupHeading title={title} count={cases.length} highlight={highlight} />
      <GroupCard highlight={highlight}>
        {cases.length === 0 && <p className="p-4 text-sm text-ink-muted">Nothing here.</p>}
        {cases.map((negotiationCase) => (
          <Link
            key={negotiationCase.id}
            href={`/business/cases/${negotiationCase.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-cream-200"
          >
            <div>
              <p className="font-bold">{negotiationCase.publicRef}</p>
              <p className="text-sm text-ink-muted">{negotiationCase.category.name}</p>
            </div>
            <div className="text-right">
              <StatusBadge status={negotiationCase.status} />
              {negotiationCase.offers[0] && (
                <p className="text-xs text-ink-muted mt-1">
                  {formatCents(negotiationCase.offers[0].finalPriceCents, negotiationCase.offers[0].currency)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </GroupCard>
    </div>
  )
}

function InviteGroup({ title, invites, muted, highlight }: { title: string; invites: InviteRow[]; muted?: boolean; highlight?: boolean }) {
  // "Not pursued" (muted) only appears once there's history; "New
  // requests" always renders, even empty, as the primary landing bucket.
  if (invites.length === 0 && muted) return null

  return (
    <div>
      <GroupHeading title={title} count={invites.length} highlight={highlight} />
      <GroupCard highlight={highlight}>
        {invites.length === 0 && <p className="p-4 text-sm text-ink-muted">Nothing here.</p>}
        {invites.map((invite) => (
          <Link
            key={invite.id}
            href={`/business/cases/${invite.caseId}`}
            className={cn("flex items-center justify-between px-6 py-4 hover:bg-cream-200", muted && "opacity-60")}
          >
            <div>
              <p className="font-bold">{invite.case.publicRef}</p>
              <p className="text-sm text-ink-muted">{invite.case.category.name}</p>
            </div>
            <StatusBadge status={invite.status} />
          </Link>
        ))}
      </GroupCard>
    </div>
  )
}
