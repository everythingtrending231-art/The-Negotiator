import crypto from "node:crypto"

// Extends Phase 1's HMAC-signed-cookie pattern rather than replacing it —
// no session table, no new dependency. The payload carries only identity
// ({ sub, exp }), never a role: every request re-reads the live User row
// for role/active, so a demoted or deactivated user can't keep acting on
// a stale cached privilege for the rest of the cookie's lifetime.
export const SESSION_COOKIE = "session"
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET is not set")
  return secret
}

export function createSessionToken(userId: string) {
  const payload = JSON.stringify({ sub: userId, exp: Date.now() + SESSION_TTL_MS })
  const payloadB64 = Buffer.from(payload).toString("base64url")
  const signature = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
  return `${payloadB64}.${signature}`
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null

  const expectedSignature = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const { sub, exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      sub: string
      exp: number
    }
    if (typeof sub !== "string" || typeof exp !== "number" || exp <= Date.now()) return null
    return sub
  } catch {
    return null
  }
}
