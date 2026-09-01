import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { requireApiSession, getActingBusinessContact } from "@/server/auth/require-session"
import { confirmOffer } from "@/server/services/offers"

export async function POST(_request: Request, context: { params: Promise<{ id: string; offerId: string }> }) {
  const result = await requireApiSession(["BUSINESS"])
  if ("error" in result) return result.error

  const { id, offerId } = await context.params
  const contact = await getActingBusinessContact(result.session)

  const negotiationCase = await prisma.negotiationCase.findUnique({ where: { id } })
  if (!negotiationCase || negotiationCase.businessId !== contact.businessId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const offer = await confirmOffer(id, offerId, contact.id)
    return NextResponse.json({ offer })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
