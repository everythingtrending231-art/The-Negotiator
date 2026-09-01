import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { grantBusinessContactAccess, ForbiddenError } from "@/server/services/users"

export async function POST(request: Request, context: { params: Promise<{ id: string; contactId: string }> }) {
  const result = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in result) return result.error

  const { contactId } = await context.params
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  try {
    const user = await grantBusinessContactAccess(contactId, password, result.session)
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
