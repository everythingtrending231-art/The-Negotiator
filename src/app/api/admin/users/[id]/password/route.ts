import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { setUserPassword, ForbiddenError } from "@/server/services/users"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  try {
    await setUserPassword(id, password, auth.session)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
