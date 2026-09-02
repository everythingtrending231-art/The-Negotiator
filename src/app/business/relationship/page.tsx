import { prisma } from "@/server/db"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { Card } from "@/components/ui/card"

// Relationship owner (already shown on Profile) + full agreement history
// as a timeline — Profile only ever shows the latest agreement.
export default async function BusinessRelationshipPage() {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  const [business, agreements] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: contact.businessId },
      include: { relationshipOwner: true },
    }),
    prisma.partnerAgreement.findMany({
      where: { businessId: contact.businessId },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Relationship</h1>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Relationship owner</h2>
        {business.relationshipOwner ? (
          <div className="text-sm">
            <p className="font-bold">{business.relationshipOwner.name}</p>
            <p className="text-ink-muted">{business.relationshipOwner.email}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No relationship owner assigned yet.</p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-sm text-ink-muted uppercase tracking-wide">Agreement history</h2>
        {agreements.length === 0 ? (
          <p className="text-sm text-ink-muted">No agreements on file.</p>
        ) : (
          <ol className="space-y-4 border-l-2 border-border pl-4">
            {agreements.map((a) => (
              <li key={a.id} className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cobalt-600" />
                <p className="font-bold text-sm">{a.agreementType.replaceAll("_", " ")}</p>
                <p className="text-xs text-ink-muted">Effective {new Date(a.effectiveDate).toLocaleDateString()}</p>
                {a.paymentTermsText && <p className="text-sm mt-1">Payment terms: {a.paymentTermsText}</p>}
                {a.serviceLevelsText && <p className="text-sm">Service levels: {a.serviceLevelsText}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
