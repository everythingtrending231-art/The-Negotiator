import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { resolveDispute } from "@/server/services/disputes"

export async function POST(request: Request, context: { params: Promise<{ id: string; disputeId: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { disputeId } = await context.params
  const negotiatorId = await getActingNegotiatorId(auth.session)
  const body = await request.json().catch(() => null)
  const resolution = typeof body?.resolution === "string" ? body.resolution.trim() : ""

  if (!resolution) {
    return NextResponse.json({ error: "A resolution summary is required." }, { status: 400 })
  }

  try {
    const dispute = await resolveDispute(disputeId, resolution, { actorType: "NEGOTIATOR", actorId: negotiatorId })
    return NextResponse.json({ dispute })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
