import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { checkRateLimit } from "./rate-limit"

describe("checkRateLimit", () => {
  it("allows requests under the max and records them", async () => {
    const key = "test:under-limit"
    for (let i = 0; i < 3; i++) {
      await expect(checkRateLimit(key, { windowMs: 60_000, max: 5 })).resolves.toBe(true)
    }
    const count = await testPrisma.rateLimitEvent.count({ where: { key } })
    expect(count).toBe(3)
  })

  it("blocks once the max is reached and does not record the rejected attempt", async () => {
    const key = "test:at-limit"
    for (let i = 0; i < 2; i++) {
      await checkRateLimit(key, { windowMs: 60_000, max: 2 })
    }
    await expect(checkRateLimit(key, { windowMs: 60_000, max: 2 })).resolves.toBe(false)

    // A rejected attempt isn't recorded — retrying doesn't dig the caller
    // in deeper once the window rolls over.
    const count = await testPrisma.rateLimitEvent.count({ where: { key } })
    expect(count).toBe(2)
  })

  it("ignores events outside the window (self-cleaning)", async () => {
    const key = "test:stale-events"
    await testPrisma.rateLimitEvent.create({
      data: { key, createdAt: new Date(Date.now() - 120_000) },
    })

    await expect(checkRateLimit(key, { windowMs: 60_000, max: 1 })).resolves.toBe(true)

    const remaining = await testPrisma.rateLimitEvent.findMany({ where: { key } })
    expect(remaining).toHaveLength(1) // the stale row was deleted, one fresh one recorded
  })

  it("tracks separate keys independently", async () => {
    const keyA = "test:key-a"
    const keyB = "test:key-b"
    await checkRateLimit(keyA, { windowMs: 60_000, max: 1 })

    await expect(checkRateLimit(keyB, { windowMs: 60_000, max: 1 })).resolves.toBe(true)
  })
})
