import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { adminUpdateOffer } from "@/server/services/offers"
import { dollarsToCents } from "@/lib/money"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  try {
    const offer = await adminUpdateOffer(
      id,
      {
        finalPriceCents: dollarsToCents(body?.finalPrice),
        originalValueCents: dollarsToCents(body?.originalValue),
        currency: typeof body?.currency === "string" ? body.currency : undefined,
        includedGoods: typeof body?.includedGoods === "string" ? body.includedGoods : undefined,
        additionalBenefits: typeof body?.additionalBenefits === "string" ? body.additionalBenefits : undefined,
        conditions: typeof body?.conditions === "string" ? body.conditions : undefined,
        validUntil: typeof body?.validUntil === "string" && body.validUntil ? new Date(body.validUntil) : undefined,
        paymentTerms: typeof body?.paymentTerms === "string" ? body.paymentTerms : undefined,
        deliveryTerms: typeof body?.deliveryTerms === "string" ? body.deliveryTerms : undefined,
      },
      auth.session.id,
    )
    return NextResponse.json({ offer })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
