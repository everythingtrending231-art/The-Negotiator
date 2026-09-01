import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import type { CaseStatus } from "@prisma/client"
import { CaseStatus as CaseStatusEnum } from "@prisma/client"

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

  const statuses = Object.values(CaseStatusEnum)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Cases
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/negotiator/cases">
          <Badge variant={!filterStatus ? "default" : "outline"}>All</Badge>
        </Link>
        {statuses.map((value) => (
          <Link key={value} href={`/negotiator/cases?status=${value}`}>
            <Badge variant={filterStatus === value ? "default" : "outline"}>{value}</Badge>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {cases.length === 0 && <p className="p-6 text-sm text-slate-500">No cases yet.</p>}
        {cases.map((negotiationCase) => (
          <Link
            key={negotiationCase.id}
            href={`/negotiator/cases/${negotiationCase.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-bold">{negotiationCase.publicRef}</p>
              <p className="text-sm text-slate-500">
                {negotiationCase.category.name} · {negotiationCase.ticket?.customerEmail}
              </p>
            </div>
            <div className="text-right">
              <Badge>{negotiationCase.status}</Badge>
              <p className="text-xs text-slate-400 mt-1">
                {negotiationCase.assignedNegotiator?.name ?? "Unassigned"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
