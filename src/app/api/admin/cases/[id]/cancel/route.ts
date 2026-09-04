import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { cancelCase } from "@/server/services/cases"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""

  if (!reason) {
    return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 })
  }

  try {
    const negotiationCase = await cancelCase(id, { actorType: "ADMIN", actorId: auth.session.id }, reason)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
