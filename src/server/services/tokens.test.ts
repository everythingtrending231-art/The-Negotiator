import { afterEach, describe, expect, it } from "vitest"
import { buildCaseUrl } from "./tokens"

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL

describe("buildCaseUrl", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL
  })

  it("builds the case URL from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://negotiator.example"
    expect(buildCaseUrl("abc123")).toBe("https://negotiator.example/case/abc123")
  })

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildCaseUrl("abc123")).toBe("http://localhost:3000/case/abc123")
  })

  // Regression test: this env var is set to an empty string (not unset)
  // in this project's Vercel deployment, which broke `?? fallback` and
  // sent customers magic links with no origin. See the || fix.
  it("falls back to localhost when NEXT_PUBLIC_APP_URL is an empty string", () => {
    process.env.NEXT_PUBLIC_APP_URL = ""
    expect(buildCaseUrl("abc123")).toBe("http://localhost:3000/case/abc123")
  })
})
