import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { SETTING_DEFS, updateSetting, type SettingKey } from "@/server/services/settings"

export async function PATCH(request: Request, context: { params: Promise<{ key: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { key } = await context.params
  if (!SETTING_DEFS.some((d) => d.key === key)) {
    return NextResponse.json({ error: "Unknown setting" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const value = typeof body?.value === "string" ? body.value.trim() : ""
  if (!value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 })
  }

  try {
    const setting = await updateSetting(key as SettingKey, value, auth.session)
    return NextResponse.json({ setting })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
