import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { updateBusinessProfile } from "@/server/services/businesses"

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
