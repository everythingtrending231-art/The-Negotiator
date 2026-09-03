import { NextResponse } from "next/server"
import { getCustomerAccountSession } from "@/server/auth/customer-session"
import { reissueTicketAccess } from "@/server/services/customer-accounts"

export async function POST(_request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const session = await getCustomerAccountSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ticketId } = await context.params

  try {
    const caseUrl = await reissueTicketAccess(session.id, ticketId)
    return NextResponse.json({ caseUrl })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
