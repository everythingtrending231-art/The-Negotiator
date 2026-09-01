import { NextResponse } from "next/server"
import { requireInternalSession } from "@/server/require-internal-session"
import { addNegotiatorMessage } from "@/server/services/messages"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireInternalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : null
  const message = typeof body?.body === "string" ? body.body.trim() : ""

  if (!negotiatorId || !message) {
    return NextResponse.json({ error: "negotiatorId and body are required" }, { status: 400 })
  }

  const created = await addNegotiatorMessage(id, negotiatorId, message)
  return NextResponse.json({ message: created })
}
