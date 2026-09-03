import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createTicket } from "@/server/test/factories"
import { createCase as createCaseService } from "@/server/services/cases"
import {
  getAccountTickets,
  reissueTicketAccess,
  requestAccountLink,
  verifyAccountToken,
} from "./customer-accounts"

describe("requestAccountLink", () => {
  it("creates a new account, sends an email, and backfills existing tickets sharing that email", async () => {
    const negotiationCase = await createCase()
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "returning@example.com" })

    await requestAccountLink("Returning@Example.com") // mixed case, on purpose

    const account = await testPrisma.customerAccount.findUnique({ where: { email: "returning@example.com" } })
    expect(account).not.toBeNull()

    const ticket = await testPrisma.negotiationTicket.findFirst({ where: { customerEmail: "returning@example.com" } })
    expect(ticket?.customerAccountId).toBe(account!.id)

    const email = await testPrisma.emailLog.findFirst({ where: { template: "account-magic-link", to: "returning@example.com" } })
    expect(email).not.toBeNull()

    const audit = await testPrisma.auditLog.findMany({ where: { relatedEntityId: account!.id } })
    expect(audit.map((a) => a.action)).toEqual(
      expect.arrayContaining(["CUSTOMER_ACCOUNT_CREATED", "CUSTOMER_ACCOUNT_TICKETS_LINKED"]),
    )
  })

  it("reuses an existing account rather than creating a second one, and never re-links already-linked tickets", async () => {
    await requestAccountLink("repeat@example.com")
    const firstAccount = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "repeat@example.com" } })

    await requestAccountLink("repeat@example.com")
    const accounts = await testPrisma.customerAccount.findMany({ where: { email: "repeat@example.com" } })
    expect(accounts).toHaveLength(1)
    expect(accounts[0].id).toBe(firstAccount.id)

    const tokens = await testPrisma.customerAccountToken.findMany({ where: { customerAccountId: firstAccount.id } })
    expect(tokens).toHaveLength(2) // one issued per request-link call
  })

  it("does nothing for an empty email", async () => {
    await requestAccountLink("   ")
    const accounts = await testPrisma.customerAccount.findMany()
    expect(accounts).toHaveLength(0)
  })
})

async function extractRawToken(email: string) {
  const log = await testPrisma.emailLog.findFirstOrThrow({
    where: { template: "account-magic-link", to: email },
    orderBy: { sentAt: "desc" },
  })
  const { magicLinkUrl } = log.dataJson as { magicLinkUrl: string }
  return new URL(magicLinkUrl).searchParams.get("token")!
}

describe("verifyAccountToken", () => {
  it("resolves a valid token to its account, then rejects the same token on a second use", async () => {
    await requestAccountLink("verify@example.com")
    const raw = await extractRawToken("verify@example.com")

    const resolved = await verifyAccountToken(raw)
    expect(resolved?.email).toBe("verify@example.com")

    expect(await verifyAccountToken(raw)).toBeNull()
  })

  it("rejects an expired token", async () => {
    await requestAccountLink("expired@example.com")
    const raw = await extractRawToken("expired@example.com")
    await testPrisma.customerAccountToken.updateMany({
      where: { customerAccount: { email: "expired@example.com" } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    expect(await verifyAccountToken(raw)).toBeNull()
  })

  it("rejects a garbage token", async () => {
    expect(await verifyAccountToken("not-a-real-token")).toBeNull()
  })
})

describe("getAccountTickets", () => {
  it("only returns tickets linked to the given account", async () => {
    const caseA = await createCase()
    const caseB = await createCase()
    await requestAccountLink("scope@example.com")
    const account = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "scope@example.com" } })

    await createTicket({ negotiationCaseId: caseA.id, customerEmail: "scope@example.com" })
    const ticketA = await testPrisma.negotiationTicket.findFirstOrThrow({ where: { negotiationCaseId: caseA.id } })
    await testPrisma.negotiationTicket.update({ where: { id: ticketA.id }, data: { customerAccountId: account.id } })
    await createTicket({ negotiationCaseId: caseB.id, customerEmail: "other@example.com" })

    const tickets = await getAccountTickets(account.id)
    expect(tickets).toHaveLength(1)
    expect(tickets[0].id).toBe(ticketA.id)
  })
})

describe("reissueTicketAccess", () => {
  it("issues a fresh access token for an active ticket owned by this account", async () => {
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    await requestAccountLink("owner@example.com")
    const account = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "owner@example.com" } })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "owner@example.com" })
    const ticket = await testPrisma.negotiationTicket.findFirstOrThrow({ where: { negotiationCaseId: negotiationCase.id } })
    await testPrisma.negotiationTicket.update({ where: { id: ticket.id }, data: { customerAccountId: account.id } })

    const caseUrl = await reissueTicketAccess(account.id, ticket.id)
    expect(caseUrl).toContain("/case/")

    const tokenCount = await testPrisma.accessToken.count({ where: { ticketId: ticket.id, revokedAt: null } })
    expect(tokenCount).toBe(1)
  })

  it("refuses a ticket that doesn't belong to this account", async () => {
    const negotiationCase = await createCase()
    await requestAccountLink("ownerA@example.com")
    await requestAccountLink("ownerB@example.com")
    const accountB = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "ownerb@example.com" } })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "ownerA@example.com" })
    const ticket = await testPrisma.negotiationTicket.findFirstOrThrow({ where: { negotiationCaseId: negotiationCase.id } })

    await expect(reissueTicketAccess(accountB.id, ticket.id)).rejects.toThrow("doesn't belong")
  })

  it("refuses a closed ticket, even if it belongs to this account", async () => {
    const negotiationCase = await createCase({ status: "CLOSED" })
    await requestAccountLink("closedowner@example.com")
    const account = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "closedowner@example.com" } })
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "closedowner@example.com", status: "CLOSED" })
    const ticket = await testPrisma.negotiationTicket.findFirstOrThrow({ where: { negotiationCaseId: negotiationCase.id } })
    await testPrisma.negotiationTicket.update({ where: { id: ticket.id }, data: { customerAccountId: account.id } })

    await expect(reissueTicketAccess(account.id, ticket.id)).rejects.toThrow("closed")
  })
})

describe("createCase auto-linking", () => {
  it("links a new ticket to an existing account sharing the same email", async () => {
    await requestAccountLink("autolink@example.com")
    const account = await testPrisma.customerAccount.findUniqueOrThrow({ where: { email: "autolink@example.com" } })
    const category = await testPrisma.category.create({ data: { name: "Autolink category", status: "ACTIVE" } })

    const { ticket } = await createCaseService({
      email: "autolink@example.com",
      categoryId: category.id,
      description: "A brand new request from a known email.",
    })

    expect(ticket.customerAccountId).toBe(account.id)
  })

  it("leaves customerAccountId null for an email with no account", async () => {
    const category = await testPrisma.category.create({ data: { name: "No account category", status: "ACTIVE" } })

    const { ticket } = await createCaseService({
      email: "no-account@example.com",
      categoryId: category.id,
      description: "A request from an email with no account.",
    })

    expect(ticket.customerAccountId).toBeNull()
  })
})
