import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { addBusinessContact } from "@/server/services/businesses"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const contact = await addBusinessContact(
    id,
    {
      name,
      role: typeof body?.role === "string" ? body.role : undefined,
      email: typeof body?.email === "string" ? body.email : undefined,
      phone: typeof body?.phone === "string" ? body.phone : undefined,
      isPrimary: typeof body?.isPrimary === "boolean" ? body.isPrimary : undefined,
    },
    auth.session,
  )
  return NextResponse.json({ contact }, { status: 201 })
}
