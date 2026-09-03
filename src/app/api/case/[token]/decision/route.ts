import { NextResponse } from "next/server"
import { resolveAccessToken } from "@/server/services/tokens"
import { recordCustomerDecision, type CustomerDecision } from "@/server/services/cases"

const VALID_DECISIONS: CustomerDecision[] = ["ACCEPTED", "DECLINED", "REQUESTED_ANOTHER_ROUND"]

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const ticket = await resolveAccessToken(token)
  if (!ticket) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const decision = typeof body?.decision === "string" ? body.decision : ""
  const offerId = typeof body?.offerId === "string" ? body.offerId : ""

  if (!VALID_DECISIONS.includes(decision as CustomerDecision) || !offerId) {
    return NextResponse.json({ error: "decision and offerId are required" }, { status: 400 })
  }

  try {
    const { negotiationCase, dealTicketUrl } = await recordCustomerDecision(
      ticket.negotiationCaseId,
      offerId,
      decision as CustomerDecision,
    )
    return NextResponse.json({ case: negotiationCase, dealTicketUrl })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
