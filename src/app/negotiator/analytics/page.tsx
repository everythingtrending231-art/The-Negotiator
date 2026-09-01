import { requireRole, getActingNegotiatorId } from "@/server/auth/require-session"
import { getNegotiatorAnalytics } from "@/server/services/analytics"
import { formatPercent, formatHours, formatNumber } from "@/lib/format"
import { Badge } from "@/components/ui/badge"

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-black" style={{ color: "#123FA9" }}>
        {value}
      </p>
    </div>
  )
}

export default async function NegotiatorAnalyticsPage() {
  const session = await requireRole(["NEGOTIATOR"])
  const negotiatorId = await getActingNegotiatorId(session)
  const a = await getNegotiatorAnalytics(negotiatorId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Your analytics
        </h1>
        <p className="text-sm text-slate-500">Scoped to cases assigned to you.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total cases" value={String(a.totalCases)} />
        <StatTile label="Acceptance rate" value={formatPercent(a.acceptanceRate)} />
        <StatTile label="Avg. negotiation duration" value={formatHours(a.avgNegotiationDurationHours)} />
        <StatTile label="Avg. rounds per case" value={formatNumber(a.avgRoundsPerCase)} />
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Cases by status</h2>
        {a.casesByStatus.length === 0 && <p className="text-sm text-slate-400">No cases assigned yet.</p>}
        <div className="flex flex-wrap gap-2">
          {a.casesByStatus.map((row) => (
            <Badge key={row.status} variant="outline">
              {row.status}: {row.count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
