import { PrismaClient } from "@prisma/client"

// A dedicated PrismaClient for integration tests — never the shared
// src/server/db.ts singleton, so a bug in that module's globalThis caching
// can't silently point test assertions at whatever database the app code
// under test resolved.
export const testPrisma = new PrismaClient()

const ALL_TABLES = [
  "User",
  "Category",
  "CategoryField",
  "Business",
  "BusinessContact",
  "BusinessNote",
  "PartnerAgreement",
  "BusinessCategory",
  "Negotiator",
  "NegotiationCase",
  "CaseBusinessInvite",
  "NegotiationTicket",
  "AccessToken",
  "CustomerAccount",
  "Message",
  "InternalNote",
  "Offer",
  "AuditLog",
  "EmailLog",
  "ContentBlock",
  "SupportInquiry",
  "RateLimitEvent",
  "SystemSetting",
]

// resetDb() is destructive (truncates every table) and integration tests
// call it between every test — this guard is the one thing standing
// between a misconfigured DATABASE_URL and wiping a real database.
function assertTestDatabase() {
  const url = process.env.DATABASE_URL ?? ""
  if (!url.includes("_test") && !/[:/]test(?:[?/]|$)/.test(url)) {
    throw new Error(
      `Refusing to reset a database whose DATABASE_URL doesn't look like a test database: ${url}`,
    )
  }
}

export async function resetDb() {
  assertTestDatabase()
  const tables = ALL_TABLES.map((t) => `"${t}"`).join(", ")
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}
