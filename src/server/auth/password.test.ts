import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct plaintext against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple")
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true)
  })

  it("rejects an incorrect plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple")
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false)
  })

  it("never stores the plaintext in the hash", async () => {
    const plain = "correct horse battery staple"
    const hash = await hashPassword(plain)
    expect(hash).not.toContain(plain)
  })

  it("produces a different hash each time (salted)", async () => {
    const plain = "correct horse battery staple"
    const [a, b] = await Promise.all([hashPassword(plain), hashPassword(plain)])
    expect(a).not.toBe(b)
  })
})
