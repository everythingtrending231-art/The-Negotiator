import { prisma } from "@/server/db"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import { computeBusinessPerformanceSummary } from "@/server/services/businesses"
import { Badge } from "@/components/ui/badge"

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
      <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
        {business.name}
      </h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <h2 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Profile</h2>
        {business.description && <p>{business.description}</p>}
        <div className="flex flex-wrap gap-2">
          {business.categories.map((bc) => (
            <Badge key={bc.categoryId} variant="outline">
              {bc.category.name}
            </Badge>
          ))}
        </div>
        <Badge>{business.verificationStatus}</Badge>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Contacts</h2>
        {business.contacts.map((c) => (
          <p key={c.id} className="text-sm">
            {c.name} {c.role && `(${c.role})`} — {c.email ?? "no email"}
            {c.userId && <span className="text-xs text-slate-400"> · portal access</span>}
          </p>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Partner agreement</h2>
        {agreement ? (
          <div className="text-sm space-y-1">
            <p className="font-bold">{agreement.agreementType.replaceAll("_", " ")}</p>
            <p className="text-slate-500">Effective {new Date(agreement.effectiveDate).toLocaleDateString()}</p>
            {agreement.paymentTermsText && <p>Payment terms: {agreement.paymentTermsText}</p>}
            {agreement.serviceLevelsText && <p>Service levels: {agreement.serviceLevelsText}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No agreement on file.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold text-sm text-slate-500 uppercase tracking-wide">Performance</h2>
        <div className="text-sm grid grid-cols-2 gap-2">
          <p>Cases: {performance.casesInvolvedCount}</p>
          <p>Offers made: {performance.offersCount}</p>
          <p>
            Offer rate:{" "}
            {performance.offerRate != null ? `${Math.round(performance.offerRate * 100)}%` : "—"}
          </p>
          <p>
            Acceptance rate:{" "}
            {performance.acceptanceRate != null ? `${Math.round(performance.acceptanceRate * 100)}%` : "—"}
          </p>
        </div>
      </div>
    </div>
  )
}
