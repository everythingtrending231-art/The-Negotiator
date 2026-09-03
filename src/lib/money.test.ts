import { describe, expect, it } from "vitest"
import { centsToDollars, dollarsToCents, formatCents } from "./money"

describe("dollarsToCents", () => {
  it("converts a dollar string to integer cents", () => {
    expect(dollarsToCents("19.99")).toBe(1999)
  })

  it("rounds fractional cents", () => {
    expect(dollarsToCents("19.996")).toBe(2000)
  })

  it("accepts a number", () => {
    expect(dollarsToCents(5)).toBe(500)
  })

  it("returns undefined for empty, null, or undefined input", () => {
    expect(dollarsToCents("")).toBeUndefined()
    expect(dollarsToCents(null)).toBeUndefined()
    expect(dollarsToCents(undefined)).toBeUndefined()
  })

  it("returns undefined for non-numeric input", () => {
    expect(dollarsToCents("not a number")).toBeUndefined()
  })
})

describe("centsToDollars", () => {
  it("formats cents as a fixed two-decimal dollar string", () => {
    expect(centsToDollars(1999)).toBe("19.99")
    expect(centsToDollars(500)).toBe("5.00")
    expect(centsToDollars(0)).toBe("0.00")
  })
})

describe("formatCents", () => {
  it("formats cents as localized currency", () => {
    expect(formatCents(1999, "USD")).toBe("$19.99")
  })

  it("respects the given currency code", () => {
    expect(formatCents(1000, "EUR")).toBe("€10.00")
  })
})
