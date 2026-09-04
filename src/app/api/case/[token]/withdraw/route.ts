import { NextResponse } from "next/server"
import { resolveAccessToken } from "@/server/services/tokens"
import { withdrawCase } from "@/server/services/cases"

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const ticket = await resolveAccessToken(token)
  if (!ticket) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  }

  try {
    const negotiationCase = await withdrawCase(ticket.negotiationCaseId)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
