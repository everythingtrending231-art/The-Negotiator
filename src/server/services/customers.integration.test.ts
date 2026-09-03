import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createCase, createTicket } from "@/server/test/factories"
import { searchCustomers } from "./customers"

describe("searchCustomers", () => {
  it("returns an empty array for a blank query", async () => {
    expect(await searchCustomers("   ")).toEqual([])
  })

  it("finds a customer by ticket history alone, with no account", async () => {
    const negotiationCase = await createCase()
    await createTicket({ negotiationCaseId: negotiationCase.id, customerEmail: "no-account@example.com" })

    const results = await searchCustomers("no-account@example.com")
    expect(results).toHaveLength(1)
    expect(results[0].account).toBeNull()
    expect(results[0].tickets).toHaveLength(1)
    expect(results[0].tickets[0].negotiationCase.publicRef).toBe(negotiationCase.publicRef)
  })

  it("groups multiple tickets under the same email and attaches account info", async () => {
    const account = await testPrisma.customerAccount.create({ data: { email: "multi@example.com" } })
    const caseA = await createCase()
    const caseB = await createCase()
    await createTicket({ negotiationCaseId: caseA.id, customerEmail: "multi@example.com" })
    const ticketA = await testPrisma.negotiationTicket.findFirstOrThrow({ where: { negotiationCaseId: caseA.id } })
    await testPrisma.negotiationTicket.update({ where: { id: ticketA.id }, data: { customerAccountId: account.id } })
    await createTicket({ negotiationCaseId: caseB.id, customerEmail: "multi@example.com" })

    const results = await searchCustomers("multi@example.com")
    expect(results).toHaveLength(1)
    expect(results[0].account?.id).toBe(account.id)
    expect(results[0].tickets).toHaveLength(2)
  })

  it("finds an account with zero tickets", async () => {
    await testPrisma.customerAccount.create({ data: { email: "zero-tickets@example.com" } })

    const results = await searchCustomers("zero-tickets@example.com")
    expect(results).toHaveLength(1)
    expect(results[0].account).not.toBeNull()
    expect(results[0].tickets).toHaveLength(0)
  })

  it("matches case-insensitively and partially, without mixing up different customers", async () => {
    const caseA = await createCase()
    const caseB = await createCase()
    await createTicket({ negotiationCaseId: caseA.id, customerEmail: "Partial.Match@Example.com" })
    await createTicket({ negotiationCaseId: caseB.id, customerEmail: "unrelated@other.com" })

    const results = await searchCustomers("partial.match")
    expect(results).toHaveLength(1)
    expect(results[0].email).toBe("Partial.Match@Example.com")
  })
})
