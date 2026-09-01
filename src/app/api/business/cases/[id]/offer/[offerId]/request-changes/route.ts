import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { requireApiSession, getActingBusinessContact } from "@/server/auth/require-session"
import { requestOfferChanges } from "@/server/services/offers"

export async function POST(request: Request, context: { params: Promise<{ id: string; offerId: string }> }) {
  const result = await requireApiSession(["BUSINESS"])
  if ("error" in result) return result.error

  const { id, offerId } = await context.params
  const contact = await getActingBusinessContact(result.session)

  const negotiationCase = await prisma.negotiationCase.findUnique({ where: { id } })
  if (!negotiationCase || negotiationCase.businessId !== contact.businessId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const note = typeof body?.note === "string" ? body.note.trim() : ""
  if (!note) {
    return NextResponse.json({ error: "A note is required so the Negotiator knows what to change" }, { status: 400 })
  }

  try {
    const offer = await requestOfferChanges(id, offerId, contact.id, note)
    return NextResponse.json({ offer })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
