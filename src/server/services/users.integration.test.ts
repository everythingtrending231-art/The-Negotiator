import { describe, expect, it } from "vitest"
import { verifyPassword } from "@/server/auth/password"
import { testPrisma } from "@/server/test/db"
import { createBusinessContact, createUser as createUserFixture } from "@/server/test/factories"
import {
  ForbiddenError,
  InvalidCurrentPasswordError,
  createUser,
  grantBusinessContactAccess,
  setOwnPassword,
  setUserActive,
  setUserPassword,
  setUserRole,
} from "./users"

describe("createUser", () => {
  it("lets a SUPER_ADMIN create an ADMIN user", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })

    const user = await createUser({
      name: "New Admin",
      email: "New.Admin@Example.com",
      role: "ADMIN",
      password: "password123",
      actor: { id: superAdmin.id, role: "SUPER_ADMIN" },
    })

    expect(user.email).toBe("new.admin@example.com")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "USER_CREATED", relatedEntityId: user.id } })
    expect(audit).not.toBeNull()
  })

  it("lets an ADMIN create a NEGOTIATOR user and provisions the negotiator profile", async () => {
    const admin = await createUserFixture({ role: "ADMIN" })

    const user = await createUser({
      name: "New Negotiator",
      email: "negotiator@example.com",
      role: "NEGOTIATOR",
      password: "password123",
      actor: { id: admin.id, role: "ADMIN" },
    })

    const profile = await testPrisma.negotiator.findUnique({ where: { userId: user.id } })
    expect(profile).not.toBeNull()
    expect(profile?.name).toBe("New Negotiator")
  })

  it("refuses to let an ADMIN create another ADMIN", async () => {
    const admin = await createUserFixture({ role: "ADMIN" })

    await expect(
      createUser({
        name: "Sneaky Admin",
        email: "sneaky@example.com",
        role: "ADMIN",
        password: "password123",
        actor: { id: admin.id, role: "ADMIN" },
      }),
    ).rejects.toThrow(ForbiddenError)
  })
})

describe("setUserRole", () => {
  it("deactivates (not deletes) the negotiator profile when moving a user off the NEGOTIATOR role", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const negotiatorUser = await createUserFixture({ role: "NEGOTIATOR" })
    const profile = await testPrisma.negotiator.create({
      data: { userId: negotiatorUser.id, name: negotiatorUser.name, email: negotiatorUser.email },
    })

    await setUserRole(negotiatorUser.id, "BUSINESS", { id: superAdmin.id, role: "SUPER_ADMIN" })

    const updatedProfile = await testPrisma.negotiator.findUniqueOrThrow({ where: { id: profile.id } })
    expect(updatedProfile.active).toBe(false)
  })

  it("provisions a negotiator profile when moving a user onto the NEGOTIATOR role", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const user = await createUserFixture({ role: "BUSINESS" })

    await setUserRole(user.id, "NEGOTIATOR", { id: superAdmin.id, role: "SUPER_ADMIN" })

    const profile = await testPrisma.negotiator.findUnique({ where: { userId: user.id } })
    expect(profile).not.toBeNull()
  })

  it("refuses when the actor can't manage the target role", async () => {
    const admin = await createUserFixture({ role: "ADMIN" })
    const otherAdmin = await createUserFixture({ role: "ADMIN" })

    await expect(setUserRole(otherAdmin.id, "NEGOTIATOR", { id: admin.id, role: "ADMIN" })).rejects.toThrow(ForbiddenError)
  })
})

describe("setUserActive", () => {
  it("deactivates and reactivates with matching audit actions", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const user = await createUserFixture({ role: "NEGOTIATOR", active: true })

    await setUserActive(user.id, false, { id: superAdmin.id, role: "SUPER_ADMIN" })
    const deactivateAudit = await testPrisma.auditLog.findFirst({ where: { action: "USER_DEACTIVATED", relatedEntityId: user.id } })
    expect(deactivateAudit).not.toBeNull()

    await setUserActive(user.id, true, { id: superAdmin.id, role: "SUPER_ADMIN" })
    const reactivateAudit = await testPrisma.auditLog.findFirst({ where: { action: "USER_REACTIVATED", relatedEntityId: user.id } })
    expect(reactivateAudit).not.toBeNull()
  })
})

describe("grantBusinessContactAccess", () => {
  it("creates a BUSINESS-role user linked to the contact", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const contact = await createBusinessContact({ email: "contact@example.com" })

    const user = await grantBusinessContactAccess(contact.id, "password123", { id: superAdmin.id, role: "SUPER_ADMIN" })
    expect(user.role).toBe("BUSINESS")

    const updatedContact = await testPrisma.businessContact.findUniqueOrThrow({ where: { id: contact.id } })
    expect(updatedContact.userId).toBe(user.id)
  })

  it("refuses when the contact already has portal access", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const existingUser = await createUserFixture({ role: "BUSINESS" })
    const contact = await createBusinessContact({ email: "contact2@example.com", userId: existingUser.id })

    await expect(
      grantBusinessContactAccess(contact.id, "password123", { id: superAdmin.id, role: "SUPER_ADMIN" }),
    ).rejects.toThrow("already has portal access")
  })

  it("refuses when the contact has no email on file", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const business = await testPrisma.business.create({ data: { name: "Biz" } })
    const contact = await testPrisma.businessContact.create({ data: { businessId: business.id, name: "No Email Guy" } })

    await expect(
      grantBusinessContactAccess(contact.id, "password123", { id: superAdmin.id, role: "SUPER_ADMIN" }),
    ).rejects.toThrow("needs an email on file")
  })

  it("refuses when the actor is only an ADMIN, not a SUPER_ADMIN", async () => {
    const admin = await createUserFixture({ role: "ADMIN" })
    const contact = await createBusinessContact({ email: "contact3@example.com" })

    await expect(grantBusinessContactAccess(contact.id, "password123", { id: admin.id, role: "ADMIN" })).rejects.toThrow(
      ForbiddenError,
    )
  })
})

describe("setOwnPassword", () => {
  it("changes the password when the current password is correct", async () => {
    const user = await createUserFixture()

    await setOwnPassword(user.id, "password123", "a-new-password")

    const updated = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } })
    await expect(verifyPassword("a-new-password", updated.passwordHash)).resolves.toBe(true)
  })

  it("refuses when the current password is wrong", async () => {
    const user = await createUserFixture()

    await expect(setOwnPassword(user.id, "wrong-password", "a-new-password")).rejects.toThrow(InvalidCurrentPasswordError)
  })
})

describe("setUserPassword", () => {
  it("lets an authorized actor reset someone else's password without proving it first", async () => {
    const superAdmin = await createUserFixture({ role: "SUPER_ADMIN" })
    const user = await createUserFixture()

    await setUserPassword(user.id, "reset-password", { id: superAdmin.id, role: "SUPER_ADMIN" })

    const updated = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } })
    await expect(verifyPassword("reset-password", updated.passwordHash)).resolves.toBe(true)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "USER_PASSWORD_RESET", relatedEntityId: user.id } })
    expect(audit?.afterJson).toBeNull()
    expect(audit?.beforeJson).toBeNull()
  })
})
