import { prisma } from "@/server/db"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { computeBusinessPerformanceSummary } from "@/server/services/businesses"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatTile, StatTileGrid } from "@/components/stat-tile"
import StatusBadge from "@/components/status-badge"

export default async function BusinessProfilePage() {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  const [business, agreement, performance] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: contact.businessId },
      include: { categories: { include: { category: true } }, contacts: true },
    }),
    prisma.partnerAgreement.findFirst({
      where: { businessId: contact.businessId },
      orderBy: { createdAt: "desc" },
    }),
    computeBusinessPerformanceSummary(contact.businessId),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">{business.name}</h1>

      <Card className="p-6 space-y-3">
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Profile</h2>
        {business.description && <p>{business.description}</p>}
        <div className="flex flex-wrap gap-2">
          {business.categories.map((bc) => (
            <Badge key={bc.categoryId} variant="outline">
              {bc.category.name}
            </Badge>
          ))}
        </div>
        <StatusBadge status={business.verificationStatus} />
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Contacts</h2>
        {business.contacts.map((c) => (
          <p key={c.id} className="text-sm">
            {c.name} {c.role && `(${c.role})`} — {c.email ?? "no email"}
            {c.userId && <span className="text-xs text-ink-muted"> · portal access</span>}
          </p>
        ))}
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Partner agreement</h2>
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
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Performance</h2>
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
    </div>
  )
}
