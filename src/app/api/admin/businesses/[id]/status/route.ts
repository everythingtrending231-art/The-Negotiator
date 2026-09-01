import { NextResponse } from "next/server"
import { BusinessVerificationStatus } from "@prisma/client"
import { requireApiSession } from "@/server/auth/require-session"
import { setBusinessVerificationStatus } from "@/server/services/businesses"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === "string" ? body.status : null

  if (!status || !(status in BusinessVerificationStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  try {
    const business = await setBusinessVerificationStatus(
      id,
      status as BusinessVerificationStatus,
      typeof body?.reasonCode === "string" ? body.reasonCode : undefined,
      typeof body?.effectiveAt === "string" && body.effectiveAt ? new Date(body.effectiveAt) : undefined,
      auth.session,
    )
    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
