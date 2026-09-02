import type { Role } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { hashPassword, verifyPassword } from "@/server/auth/password"

export class ForbiddenError extends Error {}

type Actor = { id: string; role: Role }

// SUPER_ADMIN can create/edit any role; ADMIN can only create/edit
// NEGOTIATOR users. Enforced here (not just hidden in the UI) so it holds
// even against a direct API call.
function assertCanManageRole(actorRole: Role, targetRole: Role) {
  if (actorRole === "SUPER_ADMIN") return
  if (actorRole === "ADMIN" && targetRole === "NEGOTIATOR") return
  throw new ForbiddenError("You do not have permission to manage this role.")
}

export async function createUser(input: {
  name: string
  email: string
  role: Role
  password: string
  actor: Actor
}) {
  assertCanManageRole(input.actor.role, input.role)
  const email = input.email.trim().toLowerCase()

  return prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(input.password)
    const user = await tx.user.create({
      data: { name: input.name, email, role: input.role, passwordHash },
    })

    if (input.role === "NEGOTIATOR") {
      await tx.negotiator.create({ data: { userId: user.id, name: input.name, email } })
    }

    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: input.actor.id,
      action: "USER_CREATED",
      relatedEntityType: "User",
      relatedEntityId: user.id,
      after: { email: user.email, role: user.role },
      sourceChannel: "internal",
    })

    return user
  })
}

export async function setUserRole(userId: string, role: Role, actor: Actor) {
  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { negotiatorProfile: true },
  })
  assertCanManageRole(actor.role, existing.role)
  assertCanManageRole(actor.role, role)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: userId }, data: { role } })

    if (role === "NEGOTIATOR" && !existing.negotiatorProfile) {
      await tx.negotiator.create({ data: { userId, name: existing.name, email: existing.email } })
    } else if (role !== "NEGOTIATOR" && existing.negotiatorProfile) {
      // Keep the profile — its id is referenced by case/message/offer FKs
      // and must never dangle — just drop it out of active pickers.
      await tx.negotiator.update({ where: { id: existing.negotiatorProfile.id }, data: { active: false } })
    }

    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "USER_ROLE_CHANGED",
      relatedEntityType: "User",
      relatedEntityId: userId,
      before: { role: existing.role },
      after: { role },
      sourceChannel: "internal",
    })

    return updated
  })
}

export async function setUserActive(userId: string, active: boolean, actor: Actor) {
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  assertCanManageRole(actor.role, existing.role)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: userId }, data: { active } })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      relatedEntityType: "User",
      relatedEntityId: userId,
      before: { active: existing.active },
      after: { active },
      sourceChannel: "internal",
    })
    return updated
  })
}

// A business login is always tied to a contact that already exists on a
// business record (created via the CMS) — unlike createUser's free-form
// name/email/role form, this reuses the contact's own name/email.
export async function grantBusinessContactAccess(contactId: string, password: string, actor: Actor) {
  assertCanManageRole(actor.role, "BUSINESS")

  const contact = await prisma.businessContact.findUniqueOrThrow({ where: { id: contactId } })
  if (contact.userId) {
    throw new Error("This contact already has portal access.")
  }
  if (!contact.email) {
    throw new Error("This contact needs an email on file before granting portal access.")
  }

  return prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(password)
    const user = await tx.user.create({
      data: {
        name: contact.name,
        email: contact.email!.trim().toLowerCase(),
        role: "BUSINESS",
        passwordHash,
      },
    })
    await tx.businessContact.update({ where: { id: contactId }, data: { userId: user.id } })

    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "USER_CREATED",
      relatedEntityType: "BusinessContact",
      relatedEntityId: contactId,
      after: { email: user.email, role: user.role },
      sourceChannel: "internal",
    })

    return user
  })
}

export class InvalidCurrentPasswordError extends Error {}

// Self-service counterpart to setUserPassword below — that one is
// Admin-actor-gated (assertCanManageRole) for resetting *someone else's*
// password; this one lets any signed-in user (Negotiator/Business/Admin)
// change their own, and unlike the admin path requires proving the
// current password first rather than trusting the caller's session alone.
export async function setOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const valid = await verifyPassword(currentPassword, existing.passwordHash)
  if (!valid) {
    throw new InvalidCurrentPasswordError("Current password is incorrect.")
  }
  const passwordHash = await hashPassword(newPassword)

  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } })
    await recordAudit(tx, {
      actorType: existing.role === "NEGOTIATOR" ? "NEGOTIATOR" : existing.role === "BUSINESS" ? "BUSINESS" : "ADMIN",
      actorId: userId,
      action: "USER_PASSWORD_RESET",
      relatedEntityType: "User",
      relatedEntityId: userId,
      sourceChannel: "internal",
    })
  })
}

export async function setUserPassword(userId: string, newPassword: string, actor: Actor) {
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  assertCanManageRole(actor.role, existing.role)
  const passwordHash = await hashPassword(newPassword)

  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } })
    // Records that a reset happened — never the password itself.
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "USER_PASSWORD_RESET",
      relatedEntityType: "User",
      relatedEntityId: userId,
      sourceChannel: "internal",
    })
  })
}
