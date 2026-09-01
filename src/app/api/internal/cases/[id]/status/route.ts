import { NextResponse } from "next/server"
import { CaseStatus } from "@prisma/client"
import { requireInternalSession } from "@/server/require-internal-session"
import { setCaseStatus } from "@/server/services/cases"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireInternalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === "string" ? body.status : null
  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : null

  if (!status || !(status in CaseStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  if (!negotiatorId) {
    return NextResponse.json({ error: "negotiatorId is required" }, { status: 400 })
  }

  try {
    const negotiationCase = await setCaseStatus(id, status as CaseStatus, negotiatorId)
    return NextResponse.json({ case: negotiationCase })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
