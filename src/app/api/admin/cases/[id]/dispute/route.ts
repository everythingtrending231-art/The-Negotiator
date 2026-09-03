import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { openDispute } from "@/server/services/disputes"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""

  if (!reason) {
    return NextResponse.json({ error: "A reason is required to open a dispute." }, { status: 400 })
  }

  try {
    const dispute = await openDispute(id, reason, { actorType: "ADMIN", actorId: auth.session.id })
    return NextResponse.json({ dispute }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
