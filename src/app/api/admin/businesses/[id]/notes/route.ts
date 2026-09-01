import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { addBusinessNote } from "@/server/services/businesses"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const note = typeof body?.body === "string" ? body.body.trim() : ""

  if (!note) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const created = await addBusinessNote(id, note, auth.session)
  return NextResponse.json({ note: created }, { status: 201 })
}
