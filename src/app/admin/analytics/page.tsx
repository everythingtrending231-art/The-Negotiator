import { getPlatformAnalytics } from "@/server/services/analytics"
import { formatPercent, formatHours, formatNumber } from "@/lib/format"
import { formatCents } from "@/lib/money"

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-black" style={{ color: "#123FA9" }}>
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const a = await getPlatformAnalytics()
  const maxCases = Math.max(1, ...a.casesPerNegotiator.map((n) => n.count))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Analytics
        </h1>
        <p className="text-sm text-slate-500">
          Basic metrics per docs/16 — only what&apos;s honestly computable from real case/offer data today. No
          revenue/financial figures (need Phase 3 payment data) or satisfaction/complaint metrics (never
          tracked).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Customer</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Requests submitted" value={String(a.requestsSubmitted)} />
          <StatTile label="Requests qualified" value={String(a.requestsQualified)} hint="Assigned to a Negotiator" />
          <StatTile label="Repeat request rate" value={formatPercent(a.repeatRequestRate)} />
          <StatTile label="Acceptance rate" value={formatPercent(a.acceptanceRate)} hint="Of decided offers" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Negotiation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Avg. negotiation duration" value={formatHours(a.avgNegotiationDurationHours)} />
          <StatTile label="Offer rate" value={formatPercent(a.offerRate)} hint="Qualified cases with an offer" />
          <StatTile label="Counteroffer rate" value={formatPercent(a.counterofferRate)} hint="Business requested changes" />
          <StatTile label="Avg. rounds per case" value={formatNumber(a.avgRoundsPerCase)} />
          <StatTile
            label="Avg. price improvement"
            value={a.avgPriceImprovementCents == null ? "—" : formatCents(a.avgPriceImprovementCents, "USD")}
            hint="Where a Negotiator recorded an original value — one figure among many, not a target"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Business</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Active partners" value={String(a.activePartners)} />
          <StatTile label="Avg. business confirmation time" value={formatHours(a.avgBusinessConfirmationHours)} />
          <StatTile label="Dispute rate" value={formatPercent(a.disputeRate)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Cases per Negotiator</h2>
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          {a.casesPerNegotiator.length === 0 && <p className="text-sm text-slate-400">No assigned cases yet.</p>}
          {a.casesPerNegotiator.map((n) => (
            <div key={n.negotiatorId} className="flex items-center gap-3">
              <p className="text-sm w-32 truncate">{n.negotiatorName}</p>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(n.count / maxCases) * 100}%`, backgroundColor: "#123FA9" }}
                />
              </div>
              <p className="text-sm font-bold w-8 text-right">{n.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
