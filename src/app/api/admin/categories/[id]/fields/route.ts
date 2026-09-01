import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { addCategoryField } from "@/server/services/categories"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const fieldName = typeof body?.fieldName === "string" ? body.fieldName.trim() : ""
  const fieldType = typeof body?.fieldType === "string" ? body.fieldType : "text"
  const required = typeof body?.required === "boolean" ? body.required : false

  if (!fieldName) {
    return NextResponse.json({ error: "fieldName is required" }, { status: 400 })
  }

  const field = await addCategoryField(id, { fieldName, fieldType, required }, auth.session)
  return NextResponse.json({ field }, { status: 201 })
}
