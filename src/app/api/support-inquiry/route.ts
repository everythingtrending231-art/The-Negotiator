import { NextResponse } from "next/server"
import { createSupportInquiry } from "@/server/services/support"
import { checkRateLimit, getClientIp } from "@/server/services/rate-limit"

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`support-inquiry:${getClientIp(request)}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)

  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const sourcePage = typeof body?.sourcePage === "string" ? body.sourcePage.slice(0, 200) : ""

  if (!email || !message) {
    return NextResponse.json({ error: "email and message are required" }, { status: 400 })
  }

  await createSupportInquiry({
    email,
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    sourcePage: sourcePage || "unknown",
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
