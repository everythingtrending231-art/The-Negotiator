import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCategory as createCategoryFixture, createUser } from "@/server/test/factories"
import {
  addCategoryField,
  createCategory,
  removeCategoryField,
  reorderCategory,
  setCategoryStatus,
  updateCategory,
  updateCategoryField,
} from "./categories"

async function actor() {
  const user = await createUser({ role: "ADMIN" })
  return { id: user.id }
}

describe("createCategory", () => {
  it("creates a category and audits it", async () => {
    const admin = await actor()
    const category = await createCategory({ name: "Hotels", description: "Hotel bookings" }, admin)

    expect(category.name).toBe("Hotels")
    expect(category.status).toBe("ACTIVE")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "CATEGORY_CREATED", relatedEntityId: category.id } })
    expect(audit).not.toBeNull()
  })
})

describe("updateCategory", () => {
  it("updates fields and records before/after in the audit trail", async () => {
    const admin = await actor()
    const category = await createCategoryFixture({ name: "Old name" })

    const updated = await updateCategory(category.id, { name: "New name", customerVisible: false }, admin)
    expect(updated.name).toBe("New name")
    expect(updated.customerVisible).toBe(false)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "CATEGORY_UPDATED", relatedEntityId: category.id } })
    expect((audit?.beforeJson as { name?: string } | null)?.name).toBe("Old name")
    expect((audit?.afterJson as { name?: string } | null)?.name).toBe("New name")
  })
})

describe("setCategoryStatus", () => {
  it("changes status and audits the transition", async () => {
    const admin = await actor()
    const category = await createCategoryFixture({ status: "ACTIVE" })

    const updated = await setCategoryStatus(category.id, "ARCHIVED", admin)
    expect(updated.status).toBe("ARCHIVED")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "CATEGORY_STATUS_CHANGED", relatedEntityId: category.id } })
    expect((audit?.beforeJson as { status?: string } | null)?.status).toBe("ACTIVE")
    expect((audit?.afterJson as { status?: string } | null)?.status).toBe("ARCHIVED")
  })
})

describe("reorderCategory", () => {
  it("swaps displayOrder with the previous category when moving up", async () => {
    const admin = await actor()
    const first = await testPrisma.category.create({ data: { name: "First", displayOrder: 0 } })
    const second = await testPrisma.category.create({ data: { name: "Second", displayOrder: 1 } })

    await reorderCategory(second.id, "up", admin)

    const [updatedFirst, updatedSecond] = await Promise.all([
      testPrisma.category.findUniqueOrThrow({ where: { id: first.id } }),
      testPrisma.category.findUniqueOrThrow({ where: { id: second.id } }),
    ])
    expect(updatedSecond.displayOrder).toBe(0)
    expect(updatedFirst.displayOrder).toBe(1)
  })

  it("is a no-op at the top of the list", async () => {
    const admin = await actor()
    const only = await testPrisma.category.create({ data: { name: "Only", displayOrder: 0 } })

    const result = await reorderCategory(only.id, "up", admin)
    expect(result.displayOrder).toBe(0)
  })
})

describe("category fields", () => {
  it("adds, updates, and removes a field with matching audit rows", async () => {
    const admin = await actor()
    const category = await createCategoryFixture()

    const field = await addCategoryField(category.id, { fieldName: "Check-in date", fieldType: "date", required: true }, admin)
    expect(field.displayOrder).toBe(0)

    const updated = await updateCategoryField(field.id, { fieldName: "Preferred check-in date" }, admin)
    expect(updated.fieldName).toBe("Preferred check-in date")

    await removeCategoryField(field.id, admin)
    const remaining = await testPrisma.categoryField.findUnique({ where: { id: field.id } })
    expect(remaining).toBeNull()

    const actions = await testPrisma.auditLog.findMany({ where: { relatedEntityId: field.id }, orderBy: { createdAt: "asc" } })
    expect(actions.map((a) => a.action)).toEqual(["CATEGORY_FIELD_ADDED", "CATEGORY_FIELD_UPDATED", "CATEGORY_FIELD_REMOVED"])
  })

  it("assigns the next displayOrder based on existing field count", async () => {
    const admin = await actor()
    const category = await createCategoryFixture()
    await addCategoryField(category.id, { fieldName: "First", fieldType: "text", required: false }, admin)
    const second = await addCategoryField(category.id, { fieldName: "Second", fieldType: "text", required: false }, admin)

    expect(second.displayOrder).toBe(1)
  })
})
