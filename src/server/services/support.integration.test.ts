import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createSupportInquiry } from "./support"

describe("createSupportInquiry", () => {
  it("creates the inquiry row, audits it, and emails support", async () => {
    const inquiry = await createSupportInquiry({
      email: "visitor@example.com",
      message: "Can you help me track my case?",
      sourcePage: "/",
    })

    const stored = await testPrisma.supportInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })
    expect(stored.email).toBe("visitor@example.com")
    expect(stored.sourcePage).toBe("/")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "SUPPORT_INQUIRY_CREATED", relatedEntityId: inquiry.id } })
    expect(audit).not.toBeNull()

    const email = await testPrisma.emailLog.findFirst({ where: { template: "support-inquiry" } })
    expect(email).not.toBeNull()
  })
})
