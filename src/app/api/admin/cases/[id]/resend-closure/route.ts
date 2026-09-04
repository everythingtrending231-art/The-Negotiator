import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { resendClosureRecord } from "@/server/services/cases"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const verificationNote = typeof body?.verificationNote === "string" ? body.verificationNote.trim() : ""

  if (!verificationNote) {
    return NextResponse.json(
      { error: "A verification note is required (how identity/approval was confirmed)." },
      { status: 400 },
    )
  }

  try {
    await resendClosureRecord(id, auth.session.id, verificationNote)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
