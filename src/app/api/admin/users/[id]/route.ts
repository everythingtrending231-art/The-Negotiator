import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"
import { requireApiSession } from "@/server/auth/require-session"
import { setUserRole, setUserActive, ForbiddenError } from "@/server/services/users"

const VALID_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "NEGOTIATOR"]

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  try {
    if (typeof body?.role === "string") {
      if (!VALID_ROLES.includes(body.role as Role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }
      await setUserRole(id, body.role as Role, auth.session)
    }
    if (typeof body?.active === "boolean") {
      await setUserActive(id, body.active, auth.session)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
