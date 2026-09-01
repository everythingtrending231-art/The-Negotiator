import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { setBusinessPublishStatus } from "@/server/services/businesses"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const publishStatus = typeof body?.publishStatus === "string" ? body.publishStatus : null

  if (!publishStatus) {
    return NextResponse.json({ error: "publishStatus is required" }, { status: 400 })
  }

  try {
    const business = await setBusinessPublishStatus(id, publishStatus, auth.session)
    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
