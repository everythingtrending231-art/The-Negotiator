import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { updateCategoryField, removeCategoryField } from "@/server/services/categories"

export async function PATCH(request: Request, context: { params: Promise<{ id: string; fieldId: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { fieldId } = await context.params
  const body = await request.json().catch(() => null)

  const field = await updateCategoryField(
    fieldId,
    {
      fieldName: typeof body?.fieldName === "string" ? body.fieldName : undefined,
      fieldType: typeof body?.fieldType === "string" ? body.fieldType : undefined,
      required: typeof body?.required === "boolean" ? body.required : undefined,
    },
    auth.session,
  )
  return NextResponse.json({ field })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; fieldId: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { fieldId } = await context.params
  await removeCategoryField(fieldId, auth.session)
  return NextResponse.json({ ok: true })
}
