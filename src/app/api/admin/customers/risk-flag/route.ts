import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { raiseCustomerRiskFlag } from "@/server/services/risk-flags"

export async function POST(request: Request) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""

  if (!email || !reason) {
    return NextResponse.json({ error: "An email and reason are required to raise a risk flag." }, { status: 400 })
  }

  try {
    const flag = await raiseCustomerRiskFlag(email, reason, { actorType: "ADMIN", actorId: auth.session.id })
    return NextResponse.json({ flag }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
