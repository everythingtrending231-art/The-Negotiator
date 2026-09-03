import crypto from "node:crypto"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { sendEmail } from "@/server/email/send"
import { issueAccessToken, revokeTicketTokens, buildCaseUrl } from "@/server/services/tokens"

// Short-lived: this token only ever needs to survive the round-trip to the
// customer's inbox and back, since verifying it establishes a long-lived
// session cookie (see customer-session.ts) — unlike AccessToken, nothing
// about ongoing account access depends on this token staying valid.
const TOKEN_TTL_MS = 60 * 60 * 1000

function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function buildAccountUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/account`
}

function buildAccountVerifyUrl(rawToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/api/account/verify?token=${rawToken}`
}

// Find-or-create by email, then email a login link. Always resolves the
// same way regardless of whether this is a brand-new signup or a
// returning account — the caller (the route) always responds with the
// same generic "check your email" message either way, so this endpoint
// can't be used to probe which emails have accounts.
export async function requestAccountLink(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase()
  if (!email) return

  const { account, isNew } = await prisma.$transaction(async (tx) => {
    const existing = await tx.customerAccount.findUnique({ where: { email } })
    if (existing) return { account: existing, isNew: false }

    const created = await tx.customerAccount.create({ data: { email } })
    await recordAudit(tx, {
      actorType: "CUSTOMER",
      action: "CUSTOMER_ACCOUNT_CREATED",
      relatedEntityType: "CustomerAccount",
      relatedEntityId: created.id,
      sourceChannel: "web",
    })

    // Aggregate existing tickets sharing this email (docs/08 §4.3) — a
    // customer who already submitted requests before creating an account
    // sees their history immediately, not just tickets from this point on.
    const { count } = await tx.negotiationTicket.updateMany({
      where: { customerEmail: { equals: email, mode: "insensitive" }, customerAccountId: null },
      data: { customerAccountId: created.id },
    })
    if (count > 0) {
      await recordAudit(tx, {
        actorType: "SYSTEM",
        action: "CUSTOMER_ACCOUNT_TICKETS_LINKED",
        relatedEntityType: "CustomerAccount",
        relatedEntityId: created.id,
        after: { count },
        sourceChannel: "system",
      })
    }

    return { account: created, isNew: true }
  })

  const raw = generateRawToken()
  await prisma.customerAccountToken.create({
    data: {
      customerAccountId: account.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  await sendEmail({
    to: account.email,
    template: "account-magic-link",
    data: { magicLinkUrl: buildAccountVerifyUrl(raw), isNew },
  })
}

// Not-found, revoked, expired, and already-used all fall through to
// `null` — same "never explain why" pattern as resolveAccessToken.
export async function verifyAccountToken(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const token = await prisma.customerAccountToken.findUnique({
    where: { tokenHash },
    include: { customerAccount: true },
  })

  if (!token || token.revokedAt || token.usedAt || token.expiresAt.getTime() < Date.now()) {
    return null
  }

  await prisma.customerAccountToken.update({
    where: { id: token.id },
    data: { usedAt: new Date(), revokedAt: new Date() },
  })

  return token.customerAccount
}

export async function getAccountTickets(customerAccountId: string) {
  return prisma.negotiationTicket.findMany({
    where: { customerAccountId },
    orderBy: { createdAt: "desc" },
    include: { negotiationCase: { include: { category: true } } },
  })
}

// Lets an account-authenticated customer jump back into an active case
// without a second emailed link — a stronger trust boundary than the
// magic link itself already got them this far. Closed tickets are never
// reopened this way: post-closure access always routes through Support
// (CLAUDE.md non-negotiable #5), never self-service, account or not.
export async function reissueTicketAccess(customerAccountId: string, ticketId: string) {
  const ticket = await prisma.negotiationTicket.findUniqueOrThrow({ where: { id: ticketId } })

  if (ticket.customerAccountId !== customerAccountId) {
    throw new Error("This case doesn't belong to this account.")
  }
  if (ticket.status !== "ACTIVE") {
    throw new Error("This case is closed — records are available through Support.")
  }

  const raw = await prisma.$transaction(async (tx) => {
    await revokeTicketTokens(tx, ticket.id, ticket.negotiationCaseId)
    const { raw } = await issueAccessToken(tx, ticket.id, ticket.negotiationCaseId)
    return raw
  })

  return buildCaseUrl(raw)
}
