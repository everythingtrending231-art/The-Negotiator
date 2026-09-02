import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { computeBusinessPerformanceSummary } from "@/server/services/businesses"
import { formatCents } from "@/lib/money"
import { StatTile, StatTileGrid } from "@/components/stat-tile"

// Snapshot report only — no date-bucketed trend data exists anywhere in
// the codebase yet, so this is a point-in-time summary, not a dashboard.
export default async function BusinessReportsPage() {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)
  const performance = await computeBusinessPerformanceSummary(contact.businessId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600">Reports</h1>
        <p className="text-sm text-ink-muted">A snapshot of your performance to date.</p>
      </div>

      <StatTileGrid className="grid-cols-2">
        <StatTile label="Cases involved" value={String(performance.casesInvolvedCount)} />
        <StatTile label="Offers made" value={String(performance.offersCount)} />
        <StatTile
          label="Offer rate"
          value={performance.offerRate != null ? `${Math.round(performance.offerRate * 100)}%` : "—"}
        />
        <StatTile
          label="Acceptance rate"
          value={performance.acceptanceRate != null ? `${Math.round(performance.acceptanceRate * 100)}%` : "—"}
        />
        <StatTile
          label="Avg. value created"
          value={performance.avgValueCreated == null ? "—" : formatCents(performance.avgValueCreated, "USD")}
        />
        <StatTile label="Disputed cases" value={String(performance.disputedCasesCount)} />
      </StatTileGrid>
      <p className="text-xs text-ink-muted">
        Avg. value created reflects offers where a Negotiator recorded an original value — one figure among many,
        not a target.
      </p>
    </div>
  )
}
