import { describe, expect, it } from "vitest"
import { getClientIp } from "./rate-limit"

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("http://localhost/api/test", { headers })
}

describe("getClientIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    const req = requestWithHeaders({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" })
    expect(getClientIp(req)).toBe("203.0.113.1")
  })

  it("trims whitespace around the first address", () => {
    const req = requestWithHeaders({ "x-forwarded-for": "  203.0.113.1  , 10.0.0.1" })
    expect(getClientIp(req)).toBe("203.0.113.1")
  })

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = requestWithHeaders({ "x-real-ip": "198.51.100.7" })
    expect(getClientIp(req)).toBe("198.51.100.7")
  })

  it("falls back to 'unknown' when neither header is present", () => {
    const req = requestWithHeaders({})
    expect(getClientIp(req)).toBe("unknown")
  })
})
