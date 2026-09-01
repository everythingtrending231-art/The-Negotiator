import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { updateBusinessContact, removeBusinessContact } from "@/server/services/businesses"

export async function PATCH(request: Request, context: { params: Promise<{ id: string; contactId: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { contactId } = await context.params
  const body = await request.json().catch(() => null)

  const contact = await updateBusinessContact(
    contactId,
    {
      name: typeof body?.name === "string" ? body.name : undefined,
      role: typeof body?.role === "string" ? body.role : undefined,
      email: typeof body?.email === "string" ? body.email : undefined,
      phone: typeof body?.phone === "string" ? body.phone : undefined,
      isPrimary: typeof body?.isPrimary === "boolean" ? body.isPrimary : undefined,
    },
    auth.session,
  )
  return NextResponse.json({ contact })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; contactId: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { contactId } = await context.params
  await removeBusinessContact(contactId, auth.session)
  return NextResponse.json({ ok: true })
}
