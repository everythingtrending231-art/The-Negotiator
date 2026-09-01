import crypto from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

// Provisional policy (docs/21_OPEN_DECISIONS.md marks the real one TBD —
// see CLAUDE.md rule "a TBD is not a green light" and the plan's
// assumptions section): tokens are reusable across repeat dashboard
// visits for 14 days; a resend supersedes (revokes) the prior token
// rather than a visit consuming it. Terminal-status revocation below is
// not provisional, it's spec.
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const RESEND_LIMIT = 5
export const RESEND_WINDOW_MS = 60 * 60 * 1000

function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export async function issueAccessToken(tx: Prisma.TransactionClient, ticketId: string, caseId: string) {
  const raw = generateRawToken()
  const token = await tx.accessToken.create({
    data: {
      ticketId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      singleUse: true,
    },
  })
  await recordAudit(tx, {
    actorType: "SYSTEM",
    caseId,
    action: "TOKEN_ISSUED",
    relatedEntityType: "AccessToken",
    relatedEntityId: token.id,
    sourceChannel: "system",
  })
  return { raw, token }
}

export async function revokeTicketTokens(tx: Prisma.TransactionClient, ticketId: string, caseId: string) {
  const active = await tx.accessToken.findMany({ where: { ticketId, revokedAt: null } })
  if (active.length === 0) return

  await tx.accessToken.updateMany({
    where: { ticketId, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  for (const token of active) {
    await recordAudit(tx, {
      actorType: "SYSTEM",
      caseId,
      action: "TOKEN_REVOKED",
      relatedEntityType: "AccessToken",
      relatedEntityId: token.id,
      sourceChannel: "system",
    })
  }
}

// Not-found, revoked, and expired all fall through to `null` — the caller
// renders the same closed/expired dashboard state either way, never
// leaking *why* a token doesn't work.
export async function resolveAccessToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const token = await prisma.accessToken.findUnique({
    where: { tokenHash },
    include: {
      ticket: {
        include: {
          negotiationCase: {
            include: {
              category: true,
              business: true,
              assignedNegotiator: true,
              messages: { orderBy: { createdAt: "asc" } },
              offers: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
    },
  })

  if (!token || token.revokedAt || token.expiresAt.getTime() < Date.now()) {
    return null
  }

  if (!token.usedAt) {
    await prisma.accessToken.update({ where: { id: token.id }, data: { usedAt: new Date() } })
  }

  return token.ticket
}

export async function checkResendRateLimit(caseId: string) {
  const since = new Date(Date.now() - RESEND_WINDOW_MS)
  const count = await prisma.auditLog.count({
    where: { caseId, action: "TOKEN_ISSUED", createdAt: { gte: since } },
  })
  return count < RESEND_LIMIT
}

export function buildCaseUrl(rawToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${base}/case/${rawToken}`
}
