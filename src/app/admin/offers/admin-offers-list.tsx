"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import StatusBadge from "@/components/status-badge"
import { statusLabel } from "@/lib/status-badge"
import { formatCents, centsToDollars } from "@/lib/money"
import ConfirmDialog, { useConfirmDialog } from "@/components/confirm-dialog"

type Offer = {
  id: string
  caseId: string
  casePublicRef: string
  businessName: string
  finalPriceCents: number
  originalValueCents: number | null
  currency: string
  includedGoods: string
  additionalBenefits: string | null
  conditions: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  validUntil: string
  status: string
  customerDecision: string | null
}

export default function AdminOffersList({ offers }: { offers: Offer[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <Card className="p-0 overflow-hidden divide-y divide-border">
      {offers.length === 0 ? (
        <p className="p-6 text-sm text-ink-muted">No offers yet.</p>
      ) : (
        offers.map((offer) => (
          <div key={offer.id}>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-cream-200"
              onClick={() => setExpandedId((id) => (id === offer.id ? null : offer.id))}
            >
              <div>
                <p className="font-bold text-sm">
                  {offer.casePublicRef} · {offer.businessName}
                </p>
                <p className="text-xs text-ink-muted">{formatCents(offer.finalPriceCents, offer.currency)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={offer.status} />
                {offer.customerDecision && (
                  <span className="text-xs text-ink-muted">{statusLabel(offer.customerDecision)}</span>
                )}
              </div>
            </button>
            {expandedId === offer.id && <AdminOfferEditor offer={offer} />}
          </div>
        ))
      )}
    </Card>
  )
}

function AdminOfferEditor({ offer }: { offer: Offer }) {
  const router = useRouter()
  const [finalPrice, setFinalPrice] = useState(centsToDollars(offer.finalPriceCents))
  const [originalValue, setOriginalValue] = useState(
    offer.originalValueCents != null ? centsToDollars(offer.originalValueCents) : "",
  )
  const [includedGoods, setIncludedGoods] = useState(offer.includedGoods)
  const [additionalBenefits, setAdditionalBenefits] = useState(offer.additionalBenefits ?? "")
  const [conditions, setConditions] = useState(offer.conditions ?? "")
  const [paymentTerms, setPaymentTerms] = useState(offer.paymentTerms ?? "")
  const [deliveryTerms, setDeliveryTerms] = useState(offer.deliveryTerms ?? "")
  const [validUntil, setValidUntil] = useState(offer.validUntil)
  const [busy, setBusy] = useState(false)
  const saveConfirm = useConfirmDialog()

  const locked = offer.customerDecision != null

  async function save() {
    setBusy(true)
    const res = await fetch(`/api/admin/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalPrice,
        originalValue: originalValue || undefined,
        currency: offer.currency,
        includedGoods,
        additionalBenefits: additionalBenefits || undefined,
        conditions: conditions || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryTerms: deliveryTerms || undefined,
        validUntil: validUntil || undefined,
      }),
    })
    setBusy(false)
    saveConfirm.setOpen(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't save these changes.")
      return
    }
    toast.success("Offer updated.")
    router.refresh()
  }

  return (
    <div className="border-t border-border bg-cream-100 p-4 space-y-3">
      {locked ? (
        <p className="text-sm text-ink-muted">
          The customer has already decided on this offer — it can no longer be edited.
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-muted">
            <Link href={`/admin/cases/${offer.caseId}`} className="underline text-cobalt-600">
              View full case
            </Link>{" "}
            for context, messages, and audit history.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-final-price`}>Final price ($)</Label>
              <Input id={`offer-${offer.id}-final-price`} inputMode="decimal" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-original-value`}>Original value ($, optional)</Label>
              <Input id={`offer-${offer.id}-original-value`} inputMode="decimal" value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-valid-until`}>Valid until</Label>
              <Input id={`offer-${offer.id}-valid-until`} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`offer-${offer.id}-included-goods`}>Included goods / services</Label>
            <Textarea id={`offer-${offer.id}-included-goods`} rows={2} value={includedGoods} onChange={(e) => setIncludedGoods(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-additional-benefits`}>Additional benefits</Label>
              <Input id={`offer-${offer.id}-additional-benefits`} value={additionalBenefits} onChange={(e) => setAdditionalBenefits(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-conditions`}>Conditions</Label>
              <Input id={`offer-${offer.id}-conditions`} value={conditions} onChange={(e) => setConditions(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-payment-terms`}>Payment terms</Label>
              <Input id={`offer-${offer.id}-payment-terms`} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`offer-${offer.id}-delivery-terms`}>Delivery terms</Label>
              <Input id={`offer-${offer.id}-delivery-terms`} value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
            </div>
          </div>
          <Button size="sm" disabled={busy || !finalPrice || !includedGoods.trim()} onClick={() => saveConfirm.setOpen(true)}>
            Save changes
          </Button>
        </>
      )}

      <ConfirmDialog
        open={saveConfirm.open}
        onOpenChange={saveConfirm.setOpen}
        title="Save these offer changes?"
        description="This can affect terms already presented to the customer or confirmed by the business — make sure this correction has been agreed with both sides first."
        confirmLabel="Save"
        destructive={false}
        busy={busy}
        onConfirm={save}
      />
    </div>
  )
}
