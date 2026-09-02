import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { setOwnPassword, InvalidCurrentPasswordError } from "@/server/services/users"

export async function POST(request: Request) {
  const auth = await requireApiSession(["SUPER_ADMIN", "ADMIN", "NEGOTIATOR", "BUSINESS"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
  }

  try {
    await setOwnPassword(auth.session.id, currentPassword, newPassword)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Couldn't update your password." }, { status: 400 })
  }
}
