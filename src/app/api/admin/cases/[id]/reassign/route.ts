import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { adminReassignCase } from "@/server/services/cases"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : ""

  if (!negotiatorId) {
    return NextResponse.json({ error: "A negotiator is required." }, { status: 400 })
  }

  try {
    const negotiationCase = await adminReassignCase(id, negotiatorId, auth.session.id)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
