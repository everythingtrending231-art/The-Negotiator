import { afterEach, describe, expect, it } from "vitest"
import { buildBusinessCaseUrl, buildNegotiatorCaseUrl } from "./urls"

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL

describe("buildNegotiatorCaseUrl / buildBusinessCaseUrl", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL
  })

  it("builds URLs from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://negotiator.example"
    expect(buildNegotiatorCaseUrl("case_1")).toBe("https://negotiator.example/negotiator/cases/case_1")
    expect(buildBusinessCaseUrl("case_1")).toBe("https://negotiator.example/business/cases/case_1")
  })

  // Regression test: NEXT_PUBLIC_APP_URL is set to an empty string (not
  // unset) in this project's Vercel deployment — `?? fallback` doesn't
  // catch that, `|| fallback` does.
  it("falls back to localhost when NEXT_PUBLIC_APP_URL is an empty string", () => {
    process.env.NEXT_PUBLIC_APP_URL = ""
    expect(buildNegotiatorCaseUrl("case_1")).toBe("http://localhost:3000/negotiator/cases/case_1")
    expect(buildBusinessCaseUrl("case_1")).toBe("http://localhost:3000/business/cases/case_1")
  })

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildNegotiatorCaseUrl("case_1")).toBe("http://localhost:3000/negotiator/cases/case_1")
  })
})
