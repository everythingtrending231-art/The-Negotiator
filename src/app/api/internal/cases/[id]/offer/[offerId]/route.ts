import { NextResponse } from "next/server"
import { requireInternalSession } from "@/server/require-internal-session"
import { updateOffer } from "@/server/services/offers"
import { dollarsToCents } from "@/lib/money"

export async function PATCH(request: Request, context: { params: Promise<{ id: string; offerId: string }> }) {
  if (!(await requireInternalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, offerId } = await context.params
  const body = await request.json().catch(() => null)
  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : null

  if (!negotiatorId) {
    return NextResponse.json({ error: "negotiatorId is required" }, { status: 400 })
  }

  try {
    const offer = await updateOffer(id, offerId, {
      negotiatorId,
      finalPriceCents: dollarsToCents(body?.finalPrice),
      originalValueCents: dollarsToCents(body?.originalValue),
      currency: typeof body?.currency === "string" ? body.currency : undefined,
      includedGoods: typeof body?.includedGoods === "string" ? body.includedGoods : undefined,
      additionalBenefits: typeof body?.additionalBenefits === "string" ? body.additionalBenefits : undefined,
      conditions: typeof body?.conditions === "string" ? body.conditions : undefined,
      validUntil: typeof body?.validUntil === "string" && body.validUntil ? new Date(body.validUntil) : undefined,
      paymentTerms: typeof body?.paymentTerms === "string" ? body.paymentTerms : undefined,
      deliveryTerms: typeof body?.deliveryTerms === "string" ? body.deliveryTerms : undefined,
    })
    return NextResponse.json({ offer })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
