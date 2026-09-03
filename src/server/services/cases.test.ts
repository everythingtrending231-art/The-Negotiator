import { describe, expect, it } from "vitest"
import { isTerminal } from "./cases"

describe("isTerminal", () => {
  it("treats accepted/declined/expired/cancelled/closed as terminal", () => {
    expect(isTerminal("ACCEPTED")).toBe(true)
    expect(isTerminal("DECLINED")).toBe(true)
    expect(isTerminal("EXPIRED")).toBe(true)
    expect(isTerminal("CANCELLED")).toBe(true)
    expect(isTerminal("CLOSED")).toBe(true)
  })

  it("treats every other status as non-terminal, including COMPLETED and DISPUTED", () => {
    expect(isTerminal("SUBMITTED")).toBe(false)
    expect(isTerminal("NEGOTIATING")).toBe(false)
    expect(isTerminal("OFFER_READY")).toBe(false)
    expect(isTerminal("COMPLETED")).toBe(false)
    expect(isTerminal("DISPUTED")).toBe(false)
  })
})
