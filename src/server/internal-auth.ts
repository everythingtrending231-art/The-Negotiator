import crypto from "node:crypto"

// Phase 1 has no per-user internal accounts — one shared password gates
// everything under /internal (see plan assumption 4). This is
// intentionally lightweight: a signed, expiring cookie, no session table.
export const INTERNAL_SESSION_COOKIE = "internal_session"
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

function getSecret() {
  const secret = process.env.INTERNAL_SESSION_SECRET
  if (!secret) throw new Error("INTERNAL_SESSION_SECRET is not set")
  return secret
}

export function checkInternalPassword(candidate: string) {
  const expected = process.env.INTERNAL_PASSWORD
  if (!expected) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function createSessionToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  const payloadB64 = Buffer.from(payload).toString("base64url")
  const signature = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
  return `${payloadB64}.${signature}`
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return false

  const expectedSignature = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as { exp: number }
    return typeof exp === "number" && exp > Date.now()
  } catch {
    return false
  }
}
