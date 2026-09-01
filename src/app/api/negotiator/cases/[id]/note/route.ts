import { NextResponse } from "next/server"
import { requireApiSession, getActingNegotiatorId } from "@/server/auth/require-session"
import { addInternalNote } from "@/server/services/notes"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["NEGOTIATOR"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const note = typeof body?.body === "string" ? body.body.trim() : ""

  if (!note) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const negotiatorId = await getActingNegotiatorId(auth.session)
  const created = await addInternalNote(id, negotiatorId, note)
  return NextResponse.json({ note: created })
}
