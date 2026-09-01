import { NextResponse } from "next/server"
import { CaseStatus } from "@prisma/client"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { setCaseStatus } from "@/server/services/cases"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === "string" ? body.status : null

  if (!status || !(status in CaseStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const negotiatorId = await getActingNegotiatorId(auth.session)

  try {
    const negotiationCase = await setCaseStatus(id, status as CaseStatus, negotiatorId)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
