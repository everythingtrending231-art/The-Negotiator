import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { INTERNAL_SESSION_COOKIE } from "@/server/internal-auth"

export async function POST() {
  const store = await cookies()
  store.delete(INTERNAL_SESSION_COOKIE)
  return NextResponse.json({ ok: true })
}
