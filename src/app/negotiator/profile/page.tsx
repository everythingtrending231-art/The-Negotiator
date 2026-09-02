import { requireRole, getActingNegotiatorId } from "@/server/auth/require-session"
import { getNegotiatorAnalytics } from "@/server/services/analytics"
import { formatPercent, formatHours, formatNumber } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { StatTile, StatTileGrid } from "@/components/stat-tile"
import ChangePasswordForm from "@/components/change-password-form"

export default async function NegotiatorProfilePage() {
  const session = await requireRole(["NEGOTIATOR"])
  const negotiatorId = await getActingNegotiatorId(session)
  const a = await getNegotiatorAnalytics(negotiatorId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600">{session.name}</h1>
        <p className="text-sm text-ink-muted">{session.email}</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Your performance</h2>
        <StatTileGrid className="grid-cols-2 sm:grid-cols-4">
          <StatTile label="Total cases" value={String(a.totalCases)} />
          <StatTile label="Acceptance rate" value={formatPercent(a.acceptanceRate)} />
          <StatTile label="Avg. negotiation duration" value={formatHours(a.avgNegotiationDurationHours)} />
          <StatTile label="Avg. rounds per case" value={formatNumber(a.avgRoundsPerCase)} />
        </StatTileGrid>
      </div>

      <Card className="p-6">
        <h2 className="font-bold text-cobalt-600 mb-4">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
