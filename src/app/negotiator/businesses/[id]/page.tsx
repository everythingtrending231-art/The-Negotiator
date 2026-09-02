import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/server/db"
import { computeBusinessPerformanceSummary } from "@/server/services/businesses"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { StatTile, StatTileGrid } from "@/components/stat-tile"

// Read-only "Internal Business View" (docs/09): profile, categories,
// relationship owner, partner status, agreement info, contact records,
// negotiation history, performance. No admin write actions — see
// src/app/admin/businesses/[id] for the editable version.
export default async function NegotiatorBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      partnerAgreements: { orderBy: { createdAt: "desc" }, take: 1 },
      relationshipOwner: true,
    },
  })
  if (!business) notFound()

  const [performance, recentCases] = await Promise.all([
    computeBusinessPerformanceSummary(id),
    prisma.negotiationCase.findMany({
      where: { businessId: id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { category: true },
    }),
  ])

  const agreement = business.partnerAgreements[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-cobalt-600">{business.name}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={business.publishStatus === "PUBLISHED" ? "success" : "neutral"}>{business.publishStatus}</Badge>
          <StatusBadge status={business.verificationStatus} />
        </div>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-bold text-cobalt-600">Profile</h2>
        {business.description && <p className="text-sm text-ink-soft">{business.description}</p>}
        <div className="flex flex-wrap gap-2">
          {business.categories.map((c) => (
            <Badge key={c.categoryId} variant="outline">
              {c.category.name}
            </Badge>
          ))}
        </div>
        {business.relationshipOwner && (
          <p className="text-sm text-ink-muted">Relationship owner: {business.relationshipOwner.name}</p>
        )}
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-cobalt-600">Contacts</h2>
        {business.contacts.length === 0 && <p className="text-sm text-ink-muted">None on file.</p>}
        {business.contacts.map((c) => (
          <p key={c.id} className="text-sm">
            {c.name} {c.role && `(${c.role})`} — {[c.email, c.phone].filter(Boolean).join(" · ") || "no contact info"}
          </p>
        ))}
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-cobalt-600">Partner agreement</h2>
        {agreement ? (
          <div className="text-sm space-y-1">
            <p className="font-bold">{agreement.agreementType.replaceAll("_", " ")}</p>
            <p className="text-ink-muted">Effective {new Date(agreement.effectiveDate).toLocaleDateString()}</p>
            {agreement.paymentTermsText && <p>Payment terms: {agreement.paymentTermsText}</p>}
            {agreement.serviceLevelsText && <p>Service levels: {agreement.serviceLevelsText}</p>}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No agreement on file.</p>
        )}
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Performance</h2>
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
        </StatTileGrid>
      </div>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-cobalt-600">Recent negotiation history</h2>
        {recentCases.length === 0 && <p className="text-sm text-ink-muted">No cases with this business yet.</p>}
        {recentCases.map((c) => (
          <Link
            key={c.id}
            href={`/negotiator/cases/${c.id}`}
            className="flex items-center justify-between py-1.5 text-sm hover:text-cobalt-600"
          >
            <span>
              {c.publicRef} · {c.category.name}
            </span>
            <StatusBadge status={c.status} />
          </Link>
        ))}
      </Card>
    </div>
  )
}
