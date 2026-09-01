import { NextResponse } from "next/server"
import { resolveAccessToken } from "@/server/services/tokens"
import { addCustomerMessage } from "@/server/services/messages"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const ticket = await resolveAccessToken(token)
  if (!ticket) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const message = typeof body?.body === "string" ? body.body.trim() : ""
  if (!message) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const created = await addCustomerMessage(ticket.negotiationCaseId, message)
  return NextResponse.json({ message: created })
}
