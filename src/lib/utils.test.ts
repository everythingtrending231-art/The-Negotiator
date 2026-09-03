import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("drops falsy values", () => {
    const disabled = false
    expect(cn("a", disabled && "b", undefined, null, "c")).toBe("a c")
  })

  it("resolves conflicting Tailwind utilities to the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("merges conditional class objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active")
  })
})
