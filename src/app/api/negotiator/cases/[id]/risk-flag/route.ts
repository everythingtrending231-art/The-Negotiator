import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { raiseCaseRiskFlag } from "@/server/services/risk-flags"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const negotiatorId = await getActingNegotiatorId(auth.session)
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""

  if (!reason) {
    return NextResponse.json({ error: "A reason is required to raise a risk flag." }, { status: 400 })
  }

  try {
    const flag = await raiseCaseRiskFlag(id, reason, { actorType: "NEGOTIATOR", actorId: negotiatorId })
    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
