import { prisma } from "@/server/db"

export type RateLimitConfig = { windowMs: number; max: number }

// Checks and records in one call: allowed requests are recorded (counting
// toward the window), rejected ones are not (so retrying doesn't dig the
// caller in deeper). Self-cleaning — deletes this key's own stale rows on
// every check rather than needing a cron/prune job.
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  const windowStart = new Date(Date.now() - config.windowMs)
  await prisma.rateLimitEvent.deleteMany({ where: { key, createdAt: { lt: windowStart } } })
  const count = await prisma.rateLimitEvent.count({ where: { key } })
  if (count >= config.max) return false
  await prisma.rateLimitEvent.create({ data: { key } })
  return true
}

// Vercel populates x-forwarded-for; Request.ip isn't available in the App
// Router. Falls back to a constant in local dev where the header is absent
// — rate limiting is effectively a shared bucket there, which is fine (dev
// traffic is trusted).
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}
