import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { addNegotiatorMessage } from "@/server/services/messages"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const message = typeof body?.body === "string" ? body.body.trim() : ""

  if (!message) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const negotiatorId = await getActingNegotiatorId(auth.session)
  const created = await addNegotiatorMessage(id, negotiatorId, message)
  return NextResponse.json({ message: created })
}
