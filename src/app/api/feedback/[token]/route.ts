import { NextResponse } from "next/server"
import { submitFeedback } from "@/server/services/feedback"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const body = await request.json().catch(() => null)

  const savedMoney = typeof body?.savedMoney === "boolean" ? body.savedMoney : null
  const improvedDeal = typeof body?.improvedDeal === "boolean" ? body.improvedDeal : null
  const wouldUseAgain = typeof body?.wouldUseAgain === "boolean" ? body.wouldUseAgain : null
  const negotiatorRating = typeof body?.negotiatorRating === "number" ? body.negotiatorRating : null

  if (savedMoney === null || improvedDeal === null || wouldUseAgain === null || negotiatorRating === null) {
    return NextResponse.json({ error: "All four questions are required." }, { status: 400 })
  }

  try {
    await submitFeedback(token, { savedMoney, improvedDeal, wouldUseAgain, negotiatorRating })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
