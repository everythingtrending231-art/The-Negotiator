import { describe, expect, it } from "vitest"
import { formatHours, formatNumber, formatPercent } from "./format"

describe("formatPercent", () => {
  it("formats a fraction as a rounded percent", () => {
    expect(formatPercent(0.5)).toBe("50%")
    expect(formatPercent(0.333)).toBe("33%")
  })

  it("renders an em dash for null", () => {
    expect(formatPercent(null)).toBe("—")
  })
})

describe("formatHours", () => {
  it("renders hours below a day as hrs", () => {
    expect(formatHours(5.25)).toBe("5.3 hrs")
  })

  it("renders a day or more as days", () => {
    expect(formatHours(48)).toBe("2.0 days")
  })

  it("renders an em dash for null", () => {
    expect(formatHours(null)).toBe("—")
  })
})

describe("formatNumber", () => {
  it("formats a number to one decimal place", () => {
    expect(formatNumber(3.14159)).toBe("3.1")
  })

  it("renders an em dash for null", () => {
    expect(formatNumber(null)).toBe("—")
  })
})
