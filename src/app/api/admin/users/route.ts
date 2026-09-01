import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"
import { requireApiSession } from "@/server/auth/require-session"
import { createUser, ForbiddenError } from "@/server/services/users"

const VALID_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "NEGOTIATOR"]

export async function POST(request: Request) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const role = typeof body?.role === "string" ? body.role : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!name || !email || !role || !VALID_ROLES.includes(role as Role) || password.length < 8) {
    return NextResponse.json(
      { error: "name, email, a valid role, and an 8+ character password are required" },
      { status: 400 },
    )
  }

  try {
    const user = await createUser({ name, email, role: role as Role, password, actor: auth.session })
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
