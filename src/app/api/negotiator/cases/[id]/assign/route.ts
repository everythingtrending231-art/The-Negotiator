import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { assignNegotiator } from "@/server/services/cases"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const negotiatorId = await getActingNegotiatorId(auth.session)

  try {
    const negotiationCase = await assignNegotiator(id, negotiatorId)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
