import type { CaseStatus, Role } from "@prisma/client"
import { hashPassword } from "@/server/auth/password"
import { testPrisma } from "./db"

let counter = 0
function unique(prefix: string) {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export async function createUser(overrides: Partial<{ email: string; name: string; role: Role; active: boolean }> = {}) {
  return testPrisma.user.create({
    data: {
      email: overrides.email ?? `${unique("user")}@example.com`,
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "ADMIN",
      active: overrides.active ?? true,
      passwordHash: await hashPassword("password123"),
    },
  })
}

export async function createNegotiator(overrides: Partial<{ name: string; email: string }> = {}) {
  const name = overrides.name ?? "Test Negotiator"
  const user = await createUser({ role: "NEGOTIATOR", name })
  return testPrisma.negotiator.create({
    data: {
      userId: user.id,
      name,
      email: overrides.email ?? user.email,
    },
  })
}

export async function createCategory(overrides: Partial<{ name: string; status: string; customerVisible: boolean }> = {}) {
  return testPrisma.category.create({
    data: {
      name: overrides.name ?? unique("Category"),
      status: (overrides.status as never) ?? "ACTIVE",
      customerVisible: overrides.customerVisible ?? true,
    },
  })
}

export async function createBusiness(overrides: Partial<{ name: string; customerVisible: boolean }> = {}) {
  return testPrisma.business.create({
    data: {
      name: overrides.name ?? unique("Business"),
      customerVisible: overrides.customerVisible ?? true,
    },
  })
}

export async function createCase(
  overrides: Partial<{
    categoryId: string
    status: CaseStatus
    description: string
    businessId: string
    assignedNegotiatorId: string
  }> = {},
) {
  const categoryId = overrides.categoryId ?? (await createCategory()).id
  return testPrisma.negotiationCase.create({
    data: {
      publicRef: unique("NEG"),
      categoryId,
      description: overrides.description ?? "A test negotiation case.",
      status: overrides.status ?? "SUBMITTED",
      businessId: overrides.businessId,
      assignedNegotiatorId: overrides.assignedNegotiatorId,
    },
  })
}

export async function createTicket(overrides: Partial<{ negotiationCaseId: string; customerEmail: string; status: string }> = {}) {
  const negotiationCaseId = overrides.negotiationCaseId ?? (await createCase()).id
  return testPrisma.negotiationTicket.create({
    data: {
      negotiationCaseId,
      customerEmail: overrides.customerEmail ?? "customer@example.com",
      status: overrides.status ?? "ACTIVE",
    },
  })
}

export async function createBusinessContact(
  overrides: Partial<{ businessId: string; name: string; email: string; userId: string }> = {},
) {
  const businessId = overrides.businessId ?? (await createBusiness()).id
  return testPrisma.businessContact.create({
    data: {
      businessId,
      name: overrides.name ?? "Test Contact",
      email: overrides.email ?? "contact@example.com",
      userId: overrides.userId,
    },
  })
}

export async function createOffer(
  overrides: Partial<{
    caseId: string
    negotiatorId: string
    businessId: string
    finalPriceCents: number
    includedGoods: string
    status: "PROPOSED" | "PRESENTED" | "ACCEPTED" | "DECLINED" | "SUPERSEDED" | "EXPIRED"
    businessConfirmedAt: Date
  }> = {},
) {
  const negotiatorId = overrides.negotiatorId ?? (await createNegotiator()).id
  const businessId = overrides.businessId ?? (await createBusiness()).id
  const caseId = overrides.caseId ?? (await createCase({ businessId })).id
  return testPrisma.offer.create({
    data: {
      caseId,
      negotiatorId,
      businessId,
      finalPriceCents: overrides.finalPriceCents ?? 10000,
      includedGoods: overrides.includedGoods ?? "One widget",
      status: overrides.status ?? "PROPOSED",
      businessConfirmedAt: overrides.businessConfirmedAt,
    },
  })
}
