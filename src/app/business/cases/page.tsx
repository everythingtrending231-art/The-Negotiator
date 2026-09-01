import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { formatCents } from "@/lib/money"

const TERMINAL_STATUSES = ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "COMPLETED", "DISPUTED", "CLOSED"]

export default async function BusinessCasesPage() {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  const cases = await prisma.negotiationCase.findMany({
    where: { businessId: contact.businessId },
    orderBy: { updatedAt: "desc" },
    include: { category: true, offers: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 100,
  })

  const awaitingConfirmation = cases.filter((c) => c.status === "AWAITING_BUSINESS")
  const active = cases.filter((c) => c.status !== "AWAITING_BUSINESS" && !TERMINAL_STATUSES.includes(c.status))
  const closed = cases.filter((c) => TERMINAL_STATUSES.includes(c.status))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
        Cases
      </h1>

      <CaseGroup title="Awaiting your confirmation" cases={awaitingConfirmation} />
      <CaseGroup title="Active" cases={active} />
      <CaseGroup title="Closed / deal history" cases={closed} />
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

function CaseGroup({ title, cases }: { title: string; cases: CaseRow[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</h2>
      <div className="bg-white rounded-xl shadow divide-y">
        {cases.length === 0 && <p className="p-4 text-sm text-slate-400">Nothing here.</p>}
        {cases.map((negotiationCase) => (
          <Link
            key={negotiationCase.id}
            href={`/business/cases/${negotiationCase.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-bold">{negotiationCase.publicRef}</p>
              <p className="text-sm text-slate-500">{negotiationCase.category.name}</p>
            </div>
            <div className="text-right">
              <Badge>{negotiationCase.status}</Badge>
              {negotiationCase.offers[0] && (
                <p className="text-xs text-slate-400 mt-1">
                  {formatCents(negotiationCase.offers[0].finalPriceCents, negotiationCase.offers[0].currency)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
