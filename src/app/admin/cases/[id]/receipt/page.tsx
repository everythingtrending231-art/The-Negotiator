import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/server/db"
import { requireRole } from "@/server/auth/require-session"
import { Card } from "@/components/ui/card"
import { formatCents } from "@/lib/money"

// Internal-only (Admin), not customer-facing. A customer-reachable receipt
// at /case/[token] was considered and deliberately dropped: ACCEPTED is a
// terminal case status, and the same transaction that records the
// customer's decision also revokes their ticket's access tokens (docs/03
// §10.1 — post-closure record access is never self-service, it routes
// through Support). A receipt link the customer could revisit after
// closure would work against that rule. This view exists so Admin (who
// already has standing access, not a revocable one-time link) can hand a
// deal summary to Support on request.
export default async function AdminCaseReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireRole(["ADMIN", "SUPER_ADMIN"])

  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { id },
    include: {
      category: true,
      business: true,
      offers: { where: { customerDecision: "ACCEPTED" }, orderBy: { decidedAt: "desc" }, take: 1 },
    },
  })
  if (!negotiationCase) notFound()

  const offer = negotiationCase.offers[0]

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-4 print:py-0">
      <Link href={`/admin/cases/${id}`} className="text-sm font-bold text-cobalt-600 underline print:hidden">
        ← Back to case
      </Link>

      {!offer ? (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">This case has no accepted offer — there&apos;s nothing to summarize yet.</p>
        </Card>
      ) : (
        <Card className="p-8 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{negotiationCase.publicRef}</p>
            <h1 className="text-2xl font-black text-cobalt-600">Deal summary</h1>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              <span className="text-ink-muted">Category:</span> {negotiationCase.category.name}
            </p>
            <p>
              <span className="text-ink-muted">Business:</span> {negotiationCase.business?.name ?? "—"}
            </p>
            <p>
              <span className="text-ink-muted">Requested:</span>{" "}
              {new Date(negotiationCase.createdAt).toLocaleDateString()}
            </p>
            <p>
              <span className="text-ink-muted">Accepted:</span>{" "}
              {offer.decidedAt ? new Date(offer.decidedAt).toLocaleDateString() : "—"}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">Final price</p>
            <p className="text-3xl font-black text-cobalt-600">{formatCents(offer.finalPriceCents, offer.currency)}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Included</p>
              <p>{offer.includedGoods}</p>
            </div>
            {offer.additionalBenefits && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Also included</p>
                <p>{offer.additionalBenefits}</p>
              </div>
            )}
            {offer.conditions && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Conditions</p>
                <p>{offer.conditions}</p>
              </div>
            )}
            {(offer.paymentTerms || offer.deliveryTerms) && (
              <div className="grid grid-cols-2 gap-3">
                {offer.paymentTerms && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Payment</p>
                    <p>{offer.paymentTerms}</p>
                  </div>
                )}
                {offer.deliveryTerms && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-0.5">Delivery</p>
                    <p>{offer.deliveryTerms}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-ink-muted border-t border-border pt-3">
            No payment reference number — no payment provider is integrated yet (docs/21_OPEN_DECISIONS.md).
          </p>
        </Card>
      )}
    </div>
  )
}
