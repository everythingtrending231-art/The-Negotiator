import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { clearRiskFlag } from "@/server/services/risk-flags"

export async function POST(request: Request, context: { params: Promise<{ id: string; flagId: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const negotiatorId = await getActingNegotiatorId(auth.session)
  const { flagId } = await context.params
  const body = await request.json().catch(() => null)
  const note = typeof body?.note === "string" ? body.note.trim() : ""

  if (!note) {
    return NextResponse.json({ error: "A note is required to clear a risk flag." }, { status: 400 })
  }

  try {
    const flag = await clearRiskFlag(flagId, note, { actorType: "NEGOTIATOR", actorId: negotiatorId })
    return NextResponse.json({ flag })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
