import crypto from "node:crypto"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

// Same convention as tokens.ts/feedback.ts: the raw token only ever exists
// in the emailed URL and the immediate accept-response, never persisted or
// logged in plaintext.
function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function buildTicketUrl(rawToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${base}/deal/${rawToken}`
}

export type DealTicketSnapshot = {
  businessName: string
  categoryName: string
  finalPriceCents: number
  currency: string
  includedGoods: string
  additionalBenefits: string | null
  conditions: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  validUntil: Date | null
}

// Called once, at the moment a customer accepts an offer (see
// cases.ts::recordCustomerDecision) — no payment/fee data anywhere here;
// the platform takes no transaction fee from customers (see DealTicket's
// schema comment), so this is purely a branded confirmation of the agreed
// terms, not a payment record.
export async function issueDealTicket(caseId: string, snapshot: DealTicketSnapshot) {
  const raw = generateRawToken()
  await prisma.$transaction(async (tx) => {
    const ticket = await tx.dealTicket.create({
      data: { caseId, tokenHash: hashToken(raw), ...snapshot },
    })
    await recordAudit(tx, {
      actorType: "SYSTEM",
      caseId,
      action: "DEAL_TICKET_ISSUED",
      relatedEntityType: "DealTicket",
      relatedEntityId: ticket.id,
      sourceChannel: "system",
    })
  })
  return raw
}

export async function resolveDealTicket(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  return prisma.dealTicket.findUnique({
    where: { tokenHash },
    include: { case: { select: { publicRef: true } } },
  })
}
