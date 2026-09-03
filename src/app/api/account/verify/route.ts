import { NextResponse } from "next/server"
import { verifyAccountToken } from "@/server/services/customer-accounts"
import { createCustomerSession } from "@/server/auth/customer-session"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  const accountUrl = new URL("/account", url.origin)

  if (!token) {
    accountUrl.searchParams.set("error", "invalid")
    return NextResponse.redirect(accountUrl)
  }

  const account = await verifyAccountToken(token)
  if (!account) {
    accountUrl.searchParams.set("error", "invalid")
    return NextResponse.redirect(accountUrl)
  }

  await createCustomerSession(account.id)
  return NextResponse.redirect(accountUrl)
}
