import { NextResponse } from "next/server"
import { resendTokenByEmailAndRef } from "@/server/services/tickets"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const caseRef = typeof body?.caseRef === "string" ? body.caseRef.trim() : ""

  if (!email || !caseRef) {
    return NextResponse.json({ error: "email and caseRef are required" }, { status: 400 })
  }

  await resendTokenByEmailAndRef(email, caseRef)

  // Always the same response, whether or not the combination matched a
  // real ticket — this endpoint must never confirm which case refs exist.
  return NextResponse.json({ ok: true })
}
