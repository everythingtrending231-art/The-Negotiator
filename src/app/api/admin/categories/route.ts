import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { createCategory } from "@/server/services/categories"

export async function POST(request: Request) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const category = await createCategory(
      {
        name,
        description: typeof body?.description === "string" ? body.description : undefined,
        icon: typeof body?.icon === "string" ? body.icon : undefined,
        parentCategoryId: typeof body?.parentCategoryId === "string" ? body.parentCategoryId : undefined,
        customerVisible: typeof body?.customerVisible === "boolean" ? body.customerVisible : undefined,
      },
      auth.session,
    )
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
