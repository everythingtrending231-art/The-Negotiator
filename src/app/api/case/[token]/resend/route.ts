import { NextResponse } from "next/server"
import { resolveAccessToken } from "@/server/services/tokens"
import { resendTicketToken, RateLimitError } from "@/server/services/tickets"

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const ticket = await resolveAccessToken(token)
  if (!ticket) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  }

  try {
    await resendTicketToken(ticket.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
