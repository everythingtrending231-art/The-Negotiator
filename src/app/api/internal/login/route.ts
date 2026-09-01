import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { checkInternalPassword, createSessionToken, INTERNAL_SESSION_COOKIE } from "@/server/internal-auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""

  if (!checkInternalPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const store = await cookies()
  store.set(INTERNAL_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  return NextResponse.json({ ok: true })
}
