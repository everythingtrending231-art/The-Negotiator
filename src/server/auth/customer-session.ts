import { cookies } from "next/headers"
import { prisma } from "@/server/db"
import { createSessionToken, verifySessionToken } from "@/server/auth/session"

// A separate cookie/trust boundary from the staff SESSION_COOKIE — this
// carries a CustomerAccount id, never a User id, and is never checked by
// requireRole/requireApiSession. Long-lived relative to staff sessions:
// this is meant to feel like a "remembered" login across return visits,
// not a single working session.
export const CUSTOMER_SESSION_COOKIE = "customer_session"
const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function createCustomerSession(customerAccountId: string) {
  const store = await cookies()
  store.set(CUSTOMER_SESSION_COOKIE, createSessionToken(customerAccountId, CUSTOMER_SESSION_TTL_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_MS / 1000,
  })
}

export async function getCustomerAccountSession(): Promise<{ id: string; email: string } | null> {
  const store = await cookies()
  const accountId = verifySessionToken(store.get(CUSTOMER_SESSION_COOKIE)?.value)
  if (!accountId) return null

  const account = await prisma.customerAccount.findUnique({ where: { id: accountId } })
  if (!account) return null

  return { id: account.id, email: account.email }
}

export async function clearCustomerSession() {
  const store = await cookies()
  store.delete(CUSTOMER_SESSION_COOKIE)
}
