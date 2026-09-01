import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"
import { prisma } from "@/server/db"
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const userId = verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

// For Server Components/layouts, which can redirect().
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const session = await getSession()
  if (!session || !roles.includes(session.role)) {
    redirect("/login")
  }
  return session
}

// For Route Handlers, which can't redirect() — returns an early response
// instead so the caller can `return` it directly.
export async function requireApiSession(
  roles: Role[],
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!roles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { session }
}

export async function getActingNegotiatorId(session: SessionUser): Promise<string> {
  const negotiator = await prisma.negotiator.findUniqueOrThrow({
    where: { userId: session.id, active: true },
  })
  return negotiator.id
}

export async function getActingBusinessContact(
  session: SessionUser,
): Promise<{ id: string; businessId: string; businessName: string }> {
  const contact = await prisma.businessContact.findUniqueOrThrow({
    where: { userId: session.id },
    include: { business: true },
  })
  return { id: contact.id, businessId: contact.businessId, businessName: contact.business.name }
}
