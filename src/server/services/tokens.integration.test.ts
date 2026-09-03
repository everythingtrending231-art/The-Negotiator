import { describe, expect, it } from "vitest"
import { prisma } from "@/server/db"
import { testPrisma } from "@/server/test/db"
import { createTicket } from "@/server/test/factories"
import {
  RESEND_LIMIT,
  checkResendRateLimit,
  issueAccessToken,
  resolveAccessToken,
  revokeTicketTokens,
} from "./tokens"

describe("issueAccessToken", () => {
  it("creates an AccessToken hashed from the raw token and an audit row", async () => {
    const ticket = await createTicket()

    const { raw, token } = await prisma.$transaction((tx) =>
      issueAccessToken(tx, ticket.id, ticket.negotiationCaseId),
    )

    expect(raw).toBeTruthy()
    expect(token.tokenHash).not.toBe(raw)

    const stored = await testPrisma.accessToken.findUniqueOrThrow({ where: { id: token.id } })
    expect(stored.ticketId).toBe(ticket.id)
    expect(stored.revokedAt).toBeNull()
    expect(stored.singleUse).toBe(true)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "TOKEN_ISSUED", relatedEntityId: token.id } })
    expect(audit).not.toBeNull()
    expect(audit?.actorType).toBe("SYSTEM")
  })
})

describe("revokeTicketTokens", () => {
  it("revokes every active token for the ticket and audits each one", async () => {
    const ticket = await createTicket()
    const { token: tokenA } = await prisma.$transaction((tx) => issueAccessToken(tx, ticket.id, ticket.negotiationCaseId))
    const { token: tokenB } = await prisma.$transaction((tx) => issueAccessToken(tx, ticket.id, ticket.negotiationCaseId))

    await prisma.$transaction((tx) => revokeTicketTokens(tx, ticket.id, ticket.negotiationCaseId))

    const [a, b] = await Promise.all([
      testPrisma.accessToken.findUniqueOrThrow({ where: { id: tokenA.id } }),
      testPrisma.accessToken.findUniqueOrThrow({ where: { id: tokenB.id } }),
    ])
    expect(a.revokedAt).not.toBeNull()
    expect(b.revokedAt).not.toBeNull()

    const revokedAudits = await testPrisma.auditLog.findMany({ where: { action: "TOKEN_REVOKED" } })
    expect(revokedAudits).toHaveLength(2)
  })

  it("is a no-op when there are no active tokens", async () => {
    const ticket = await createTicket()
    await expect(prisma.$transaction((tx) => revokeTicketTokens(tx, ticket.id, ticket.negotiationCaseId))).resolves.toBeUndefined()
  })
})

describe("resolveAccessToken", () => {
  it("resolves a valid token to its ticket and marks it used", async () => {
    const ticket = await createTicket()
    const { raw, token } = await prisma.$transaction((tx) => issueAccessToken(tx, ticket.id, ticket.negotiationCaseId))

    const resolved = await resolveAccessToken(raw)
    expect(resolved?.id).toBe(ticket.id)

    const stored = await testPrisma.accessToken.findUniqueOrThrow({ where: { id: token.id } })
    expect(stored.usedAt).not.toBeNull()
  })

  it("returns null for a token that doesn't exist", async () => {
    await expect(resolveAccessToken("not-a-real-token")).resolves.toBeNull()
  })

  it("returns null for a revoked token", async () => {
    const ticket = await createTicket()
    const { raw } = await prisma.$transaction((tx) => issueAccessToken(tx, ticket.id, ticket.negotiationCaseId))
    await prisma.$transaction((tx) => revokeTicketTokens(tx, ticket.id, ticket.negotiationCaseId))

    await expect(resolveAccessToken(raw)).resolves.toBeNull()
  })

  it("returns null for an expired token", async () => {
    const ticket = await createTicket()
    const { raw, token } = await prisma.$transaction((tx) => issueAccessToken(tx, ticket.id, ticket.negotiationCaseId))
    await testPrisma.accessToken.update({ where: { id: token.id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    await expect(resolveAccessToken(raw)).resolves.toBeNull()
  })
})

describe("checkResendRateLimit", () => {
  it("allows resends while under the limit", async () => {
    const ticket = await createTicket()
    await expect(checkResendRateLimit(ticket.negotiationCaseId)).resolves.toBe(true)
  })

  it("blocks once the case has hit RESEND_LIMIT TOKEN_ISSUED events in the window", async () => {
    const ticket = await createTicket()
    for (let i = 0; i < RESEND_LIMIT; i++) {
      await testPrisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          caseId: ticket.negotiationCaseId,
          action: "TOKEN_ISSUED",
          sourceChannel: "system",
        },
      })
    }

    await expect(checkResendRateLimit(ticket.negotiationCaseId)).resolves.toBe(false)
  })

  it("only counts TOKEN_ISSUED events for this specific case", async () => {
    const ticketA = await createTicket()
    const ticketB = await createTicket()
    for (let i = 0; i < RESEND_LIMIT; i++) {
      await testPrisma.auditLog.create({
        data: {
          actorType: "SYSTEM",
          caseId: ticketA.negotiationCaseId,
          action: "TOKEN_ISSUED",
          sourceChannel: "system",
        },
      })
    }

    await expect(checkResendRateLimit(ticketB.negotiationCaseId)).resolves.toBe(true)
  })
})
