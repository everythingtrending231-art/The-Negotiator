import type { CategoryStatus } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

type Actor = { id: string }

export type CreateCategoryInput = {
  name: string
  description?: string
  icon?: string
  parentCategoryId?: string
  customerVisible?: boolean
}

export async function createCategory(input: CreateCategoryInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        name: input.name,
        description: input.description,
        icon: input.icon,
        parentCategoryId: input.parentCategoryId,
        customerVisible: input.customerVisible ?? true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_CREATED",
      relatedEntityType: "Category",
      relatedEntityId: category.id,
      after: { name: category.name, status: category.status },
      sourceChannel: "internal",
    })
    return category
  })
}

export type UpdateCategoryInput = {
  name?: string
  description?: string
  icon?: string
  parentCategoryId?: string | null
  customerVisible?: boolean
}

export async function updateCategory(id: string, input: UpdateCategoryInput, actor: Actor) {
  const existing = await prisma.category.findUniqueOrThrow({ where: { id } })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: { id },
      data: { ...input, updatedBy: actor.id },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_UPDATED",
      relatedEntityType: "Category",
      relatedEntityId: id,
      before: { name: existing.name, description: existing.description, customerVisible: existing.customerVisible },
      after: { name: updated.name, description: updated.description, customerVisible: updated.customerVisible },
      sourceChannel: "internal",
    })
    return updated
  })
}

// Archiving needs no extra enforcement code — /api/request already rejects
// any non-ACTIVE category, so this alone satisfies docs/22 §4.3's "block
// new requests, keep historical data" for free.
export async function setCategoryStatus(id: string, status: CategoryStatus, actor: Actor) {
  const existing = await prisma.category.findUniqueOrThrow({ where: { id } })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({ where: { id }, data: { status, updatedBy: actor.id } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_STATUS_CHANGED",
      relatedEntityType: "Category",
      relatedEntityId: id,
      before: { status: existing.status },
      after: { status },
      sourceChannel: "internal",
    })
    return updated
  })
}

// Numeric displayOrder + swap-with-neighbor, not drag-and-drop — avoids a
// DnD dependency for what the underlying capability only needs.
export async function reorderCategory(id: string, direction: "up" | "down", actor: Actor) {
  const all = await prisma.category.findMany({ orderBy: { displayOrder: "asc" } })
  const index = all.findIndex((c) => c.id === id)
  if (index === -1) throw new Error("Category not found")

  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= all.length) return all[index]

  const current = all[index]
  const swapWith = all[swapIndex]

  return prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id: current.id }, data: { displayOrder: swapWith.displayOrder } })
    await tx.category.update({ where: { id: swapWith.id }, data: { displayOrder: current.displayOrder } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_REORDERED",
      relatedEntityType: "Category",
      relatedEntityId: current.id,
      before: { displayOrder: current.displayOrder },
      after: { displayOrder: swapWith.displayOrder },
      sourceChannel: "internal",
    })
    return tx.category.findUniqueOrThrow({ where: { id: current.id } })
  })
}

export type CategoryFieldInput = {
  fieldName: string
  fieldType: string
  required: boolean
  fieldOptions?: string[]
}

// Individual CRUD, not wholesale replace — so field ids already referenced
// by existing cases' categoryFieldValues stay stable.
export async function addCategoryField(categoryId: string, field: CategoryFieldInput, actor: Actor) {
  const count = await prisma.categoryField.count({ where: { categoryId } })

  return prisma.$transaction(async (tx) => {
    const created = await tx.categoryField.create({
      data: {
        categoryId,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required,
        fieldOptions: field.fieldOptions ?? [],
        displayOrder: count,
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_FIELD_ADDED",
      relatedEntityType: "CategoryField",
      relatedEntityId: created.id,
      after: { fieldName: created.fieldName, fieldType: created.fieldType },
      sourceChannel: "internal",
    })
    return created
  })
}

export async function updateCategoryField(
  fieldId: string,
  field: Partial<CategoryFieldInput>,
  actor: Actor,
) {
  const existing = await prisma.categoryField.findUniqueOrThrow({ where: { id: fieldId } })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.categoryField.update({ where: { id: fieldId }, data: field })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_FIELD_UPDATED",
      relatedEntityType: "CategoryField",
      relatedEntityId: fieldId,
      before: { fieldName: existing.fieldName, fieldType: existing.fieldType, required: existing.required },
      after: { fieldName: updated.fieldName, fieldType: updated.fieldType, required: updated.required },
      sourceChannel: "internal",
    })
    return updated
  })
}

export async function removeCategoryField(fieldId: string, actor: Actor) {
  const existing = await prisma.categoryField.findUniqueOrThrow({ where: { id: fieldId } })

  await prisma.$transaction(async (tx) => {
    await tx.categoryField.delete({ where: { id: fieldId } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CATEGORY_FIELD_REMOVED",
      relatedEntityType: "CategoryField",
      relatedEntityId: fieldId,
      before: { fieldName: existing.fieldName },
      sourceChannel: "internal",
    })
  })
}
