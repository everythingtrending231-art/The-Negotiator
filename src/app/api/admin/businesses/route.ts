import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { createBusiness } from "@/server/services/businesses"

export async function POST(request: Request) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const categoryIds = Array.isArray(body?.categoryIds) ? body.categoryIds.filter((v: unknown) => typeof v === "string") : []

  if (!name || categoryIds.length === 0) {
    return NextResponse.json({ error: "name and at least one categoryId are required" }, { status: 400 })
  }

  try {
    const business = await createBusiness(
      {
        name,
        categoryIds,
        description: typeof body?.description === "string" ? body.description : undefined,
        logoUrl: typeof body?.logoUrl === "string" ? body.logoUrl : undefined,
        customerVisible: typeof body?.customerVisible === "boolean" ? body.customerVisible : undefined,
        relationshipOwnerId: typeof body?.relationshipOwnerId === "string" ? body.relationshipOwnerId : undefined,
        locations: Array.isArray(body?.locations) ? body.locations : undefined,
      },
      auth.session,
    )
    return NextResponse.json({ business }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
