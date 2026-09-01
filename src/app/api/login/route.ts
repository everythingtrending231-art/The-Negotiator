import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { verifyPassword } from "@/server/auth/password"
import { createSessionToken, SESSION_COOKIE } from "@/server/auth/session"

// A hash of a value nobody will ever type, used to keep verifyPassword's
// timing the same whether or not the email matched a real user — a basic
// defense against timing-based user enumeration on login.
const DUMMY_HASH = "$2b$12$wQk3bSlDknU0hrya5K6XQeD7f5PBBGo2bbuhote6yLr1xVx0xHri."

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !valid || !user.active) {
    await recordAudit(prisma, {
      actorType: "SYSTEM",
      action: "LOGIN_FAILED",
      after: { email },
      sourceChannel: "web",
    })
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  await recordAudit(prisma, {
    actorType: user.role === "NEGOTIATOR" ? "NEGOTIATOR" : "ADMIN",
    actorId: user.id,
    action: "LOGIN_SUCCEEDED",
    sourceChannel: "web",
  })

  return NextResponse.json({ ok: true, role: user.role })
}
