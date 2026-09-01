import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { requireApiSession, getActingBusinessContact } from "@/server/auth/require-session"
import { respondToInvite } from "@/server/services/invites"

export async function POST(request: Request, context: { params: Promise<{ id: string; inviteId: string }> }) {
  const result = await requireApiSession(["BUSINESS"])
  if ("error" in result) return result.error

  const { id, inviteId } = await context.params
  const contact = await getActingBusinessContact(result.session)

  const invite = await prisma.caseBusinessInvite.findUnique({ where: { id: inviteId } })
  if (!invite || invite.caseId !== id || invite.businessId !== contact.businessId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const decision = body?.decision === "ACCEPTED" || body?.decision === "DECLINED" ? body.decision : null
  if (!decision) {
    return NextResponse.json({ error: "decision must be ACCEPTED or DECLINED" }, { status: 400 })
  }
  const note = typeof body?.note === "string" ? body.note.trim() : undefined

  try {
    const updated = await respondToInvite(inviteId, contact.id, decision, note)
    return NextResponse.json({ invite: updated })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
