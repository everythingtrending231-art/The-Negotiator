import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { sendInvites } from "@/server/services/invites"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireApiSession(["NEGOTIATOR"])
  if ("error" in result) return result.error

  const { id } = await context.params
  const negotiatorId = await getActingNegotiatorId(result.session)

  const body = await request.json().catch(() => null)
  const businessIds = Array.isArray(body?.businessIds) ? body.businessIds.filter((v: unknown) => typeof v === "string") : []
  if (businessIds.length === 0) {
    return NextResponse.json({ error: "businessIds is required" }, { status: 400 })
  }

  try {
    const { created, skipped } = await sendInvites(id, businessIds, negotiatorId)
    return NextResponse.json({ created: created.length, skipped })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
