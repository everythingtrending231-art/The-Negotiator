import { NextResponse } from "next/server"
import { requireInternalSession } from "@/server/require-internal-session"
import { createOffer } from "@/server/services/offers"
import { dollarsToCents } from "@/lib/money"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireInternalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : null
  const businessId = typeof body?.businessId === "string" ? body.businessId : null
  const includedGoods = typeof body?.includedGoods === "string" ? body.includedGoods.trim() : ""
  const finalPriceCents = dollarsToCents(body?.finalPrice)

  if (!negotiatorId || !businessId || !includedGoods || finalPriceCents === undefined) {
    return NextResponse.json(
      { error: "negotiatorId, businessId, includedGoods, and finalPrice are required" },
      { status: 400 },
    )
  }

  try {
    const offer = await createOffer({
      caseId: id,
      negotiatorId,
      businessId,
      finalPriceCents,
      includedGoods,
      currency: typeof body?.currency === "string" ? body.currency : undefined,
      originalValueCents: dollarsToCents(body?.originalValue),
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
