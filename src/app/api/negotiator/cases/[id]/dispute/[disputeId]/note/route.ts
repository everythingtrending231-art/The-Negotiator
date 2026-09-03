import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { addDisputeNote } from "@/server/services/disputes"

export async function POST(request: Request, context: { params: Promise<{ id: string; disputeId: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { disputeId } = await context.params
  const negotiatorId = await getActingNegotiatorId(auth.session)
  const body = await request.json().catch(() => null)
  const noteBody = typeof body?.body === "string" ? body.body.trim() : ""

  if (!noteBody) {
    return NextResponse.json({ error: "A note body is required." }, { status: 400 })
  }

  try {
    const note = await addDisputeNote(disputeId, noteBody, { actorType: "NEGOTIATOR", actorId: negotiatorId })
    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
