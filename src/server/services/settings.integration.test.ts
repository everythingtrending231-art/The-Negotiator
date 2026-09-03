import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createUser } from "@/server/test/factories"
import { getAllSettings, getSetting, getSettingNumber, updateSetting } from "./settings"

describe("getSetting / getAllSettings", () => {
  it("falls back to the built-in default when no row exists", async () => {
    expect(await getSetting("requestRateLimitMax")).toBe("5")
    const all = await getAllSettings()
    expect(all.find((s) => s.key === "requestRateLimitMax")?.value).toBe("5")
  })

  it("returns the stored value once one exists, without touching other settings", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await updateSetting("requestRateLimitMax", "25", { id: admin.id })

    expect(await getSetting("requestRateLimitMax")).toBe("25")
    expect(await getSettingNumber("requestRateLimitMax")).toBe(25)
    expect(await getSetting("loginRateLimitMax")).toBe("10")
  })
})

describe("updateSetting", () => {
  it("upserts the value, records who changed it, and writes an audit row", async () => {
    const admin = await createUser({ role: "ADMIN" })

    const row = await updateSetting("supportEmail", "help@example.com", { id: admin.id })
    expect(row.value).toBe("help@example.com")
    expect(row.updatedBy).toBe(admin.id)

    const audit = await testPrisma.auditLog.findFirst({
      where: { action: "SETTING_UPDATED", relatedEntityId: "supportEmail" },
    })
    expect(audit).not.toBeNull()
    expect((audit?.afterJson as { value?: string } | null)?.value).toBe("help@example.com")
  })

  it("rejects a non-positive-integer value for a number setting", async () => {
    const admin = await createUser({ role: "ADMIN" })

    await expect(updateSetting("loginRateLimitMax", "not-a-number", { id: admin.id })).rejects.toThrow(
      "whole number",
    )
    await expect(updateSetting("loginRateLimitMax", "0", { id: admin.id })).rejects.toThrow("whole number")
    await expect(updateSetting("loginRateLimitMax", "-3", { id: admin.id })).rejects.toThrow("whole number")
  })

  it("rejects an unknown setting key", async () => {
    const admin = await createUser({ role: "ADMIN" })
    // @ts-expect-error deliberately testing an invalid key at runtime
    await expect(updateSetting("notARealSetting", "x", { id: admin.id })).rejects.toThrow("Unknown setting")
  })
})
