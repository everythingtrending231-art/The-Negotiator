import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { updateBusinessProfile, deleteBusiness } from "@/server/services/businesses"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  try {
    const business = await updateBusinessProfile(
      id,
      {
        name: typeof body?.name === "string" ? body.name : undefined,
        description: typeof body?.description === "string" ? body.description : undefined,
        logoUrl: typeof body?.logoUrl === "string" ? body.logoUrl : undefined,
        categoryIds: Array.isArray(body?.categoryIds) ? body.categoryIds : undefined,
        locations: Array.isArray(body?.locations) ? body.locations : undefined,
        relationshipOwnerId:
          typeof body?.relationshipOwnerId === "string"
            ? body.relationshipOwnerId
            : body?.relationshipOwnerId === null
              ? null
              : undefined,
      },
      auth.session,
    )
    return NextResponse.json({ business })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""

  if (!reason) {
    return NextResponse.json({ error: "A reason is required to delete a business." }, { status: 400 })
  }

  try {
    await deleteBusiness(id, reason, auth.session)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
