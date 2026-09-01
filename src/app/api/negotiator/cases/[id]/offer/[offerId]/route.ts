import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { updateOffer } from "@/server/services/offers"
import { dollarsToCents } from "@/lib/money"

export async function PATCH(request: Request, context: { params: Promise<{ id: string; offerId: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id, offerId } = await context.params
  const body = await request.json().catch(() => null)
  const negotiatorId = await getActingNegotiatorId(auth.session)

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
