import { requireRole, getActingNegotiatorId } from "@/server/auth/require-session"
import { getNegotiatorAnalytics } from "@/server/services/analytics"
import { formatPercent, formatHours, formatNumber } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { StatTile, StatTileGrid } from "@/components/stat-tile"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"

export default async function NegotiatorAnalyticsPage() {
  const session = await requireRole(["NEGOTIATOR"])
  const negotiatorId = await getActingNegotiatorId(session)
  const a = await getNegotiatorAnalytics(negotiatorId)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600">Your analytics</h1>
        <p className="text-sm text-ink-muted">Scoped to cases assigned to you.</p>
      </div>

      <StatTileGrid className="grid-cols-2 sm:grid-cols-4">
        <StatTile label="Total cases" value={String(a.totalCases)} />
        <StatTile label="Acceptance rate" value={formatPercent(a.acceptanceRate)} />
        <StatTile label="Avg. negotiation duration" value={formatHours(a.avgNegotiationDurationHours)} />
        <StatTile label="Avg. rounds per case" value={formatNumber(a.avgRoundsPerCase)} />
      </StatTileGrid>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Cases by status</h2>
        {a.casesByStatus.length === 0 && <p className="text-sm text-ink-muted">No cases assigned yet.</p>}
        <div className="flex flex-wrap gap-2">
          {a.casesByStatus.map((row) => (
            <StatusBadge key={row.status} status={row.status} label={`${statusLabel(row.status)}: ${row.count}`} />
          ))}
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide mb-3">Customer feedback</h2>
        <p className="text-xs text-ink-muted mb-3">
          From the post-closure survey — self-reported, and only from customers who responded.
        </p>
        <StatTileGrid className="grid-cols-2 sm:grid-cols-4">
          <StatTile label="Response rate" value={formatPercent(a.feedbackResponseRate)} />
          <StatTile label="Your rating" value={a.avgNegotiatorRating == null ? "—" : `${formatNumber(a.avgNegotiatorRating)} / 5`} />
          <StatTile label="Saved money" value={formatPercent(a.savedMoneyRate)} />
          <StatTile label="Would use again" value={formatPercent(a.wouldUseAgainRate)} />
        </StatTileGrid>
      </div>
    </div>
  )
}
