import { NextResponse } from "next/server"
import { CategoryStatus } from "@prisma/client"
import { requireApiSession } from "@/server/auth/require-session"
import { updateCategory, setCategoryStatus, reorderCategory } from "@/server/services/categories"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  try {
    if (body?.direction === "up" || body?.direction === "down") {
      await reorderCategory(id, body.direction, auth.session)
    }
    if (typeof body?.status === "string") {
      if (!(body.status in CategoryStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      await setCategoryStatus(id, body.status as CategoryStatus, auth.session)
    }

    const hasProfileEdit =
      typeof body?.name === "string" ||
      typeof body?.description === "string" ||
      typeof body?.icon === "string" ||
      typeof body?.customerVisible === "boolean" ||
      "parentCategoryId" in (body ?? {})

    if (hasProfileEdit) {
      await updateCategory(
        id,
        {
          name: typeof body?.name === "string" ? body.name : undefined,
          description: typeof body?.description === "string" ? body.description : undefined,
          icon: typeof body?.icon === "string" ? body.icon : undefined,
          parentCategoryId: typeof body?.parentCategoryId === "string" ? body.parentCategoryId : undefined,
          customerVisible: typeof body?.customerVisible === "boolean" ? body.customerVisible : undefined,
        },
        auth.session,
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
