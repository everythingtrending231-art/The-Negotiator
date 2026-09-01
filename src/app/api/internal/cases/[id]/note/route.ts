import { NextResponse } from "next/server"
import { requireInternalSession } from "@/server/require-internal-session"
import { addInternalNote } from "@/server/services/notes"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireInternalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const negotiatorId = typeof body?.negotiatorId === "string" ? body.negotiatorId : null
  const note = typeof body?.body === "string" ? body.body.trim() : ""

  if (!negotiatorId || !note) {
    return NextResponse.json({ error: "negotiatorId and body are required" }, { status: 400 })
  }

  const created = await addInternalNote(id, negotiatorId, note)
  return NextResponse.json({ note: created })
}
