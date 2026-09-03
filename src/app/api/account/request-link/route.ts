import { NextResponse } from "next/server"
import { requestAccountLink } from "@/server/services/customer-accounts"
import { checkRateLimit, getClientIp } from "@/server/services/rate-limit"
import { getSettingNumber } from "@/server/services/settings"

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`account-request-link:${getClientIp(request)}`, {
    windowMs: 60 * 60 * 1000,
    max: await getSettingNumber("accountLoginRateLimitMax"),
  })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  await requestAccountLink(email)

  // Always the same response — this endpoint must never confirm whether
  // an account already existed for this email.
  return NextResponse.json({ ok: true })
}
