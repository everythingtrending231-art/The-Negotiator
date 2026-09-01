import { cookies } from "next/headers"
import { INTERNAL_SESSION_COOKIE, verifySessionToken } from "@/server/internal-auth"

export async function requireInternalSession() {
  const store = await cookies()
  return verifySessionToken(store.get(INTERNAL_SESSION_COOKIE)?.value)
}
