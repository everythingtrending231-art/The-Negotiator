import { describe, expect, it } from "vitest"
import { statusLabel, statusVariant } from "./status-badge"

describe("statusVariant", () => {
  it("maps known statuses to their color intent", () => {
    expect(statusVariant("ACCEPTED")).toBe("success")
    expect(statusVariant("DECLINED")).toBe("danger")
    expect(statusVariant("NEGOTIATING")).toBe("cobalt")
    expect(statusVariant("SUBMITTED")).toBe("amber")
    expect(statusVariant("DRAFT")).toBe("neutral")
  })

  it("falls back to outline for an unmapped status", () => {
    expect(statusVariant("SOME_FUTURE_STATUS")).toBe("outline")
  })
})

describe("statusLabel", () => {
  it("title-cases a snake-case status", () => {
    expect(statusLabel("AWAITING_BUSINESS")).toBe("Awaiting Business")
  })

  it("handles a single-word status", () => {
    expect(statusLabel("ACTIVE")).toBe("Active")
  })
})
