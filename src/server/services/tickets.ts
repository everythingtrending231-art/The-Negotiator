import { prisma } from "@/server/db"
import { checkResendRateLimit, issueAccessToken, revokeTicketTokens, buildCaseUrl } from "@/server/services/tokens"
import { sendEmail } from "@/server/email/send"

export class RateLimitError extends Error {}

export async function resendTicketToken(ticketId: string) {
  const ticket = await prisma.negotiationTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { negotiationCase: true },
  })

  if (ticket.status !== "ACTIVE") {
    throw new Error("This case is closed; the link can no longer be resent.")
  }

  const allowed = await checkResendRateLimit(ticket.negotiationCaseId)
  if (!allowed) {
    throw new RateLimitError("Too many resend requests for this case — try again later.")
  }

  const raw = await prisma.$transaction(async (tx) => {
    await revokeTicketTokens(tx, ticket.id, ticket.negotiationCaseId)
    const { raw } = await issueAccessToken(tx, ticket.id, ticket.negotiationCaseId)
    return raw
  })

  await sendEmail({
    to: ticket.customerEmail,
    template: "magic-link-resend",
    data: { caseRef: ticket.negotiationCase.publicRef, magicLinkUrl: buildCaseUrl(raw) },
  })
}

// Lost-link recovery. Always resolves the same way regardless of whether
// the email/case-reference combination is real, so the response can't be
// used to probe for valid case references.
export async function resendTokenByEmailAndRef(email: string, caseRef: string) {
  const negotiationCase = await prisma.negotiationCase.findUnique({
    where: { publicRef: caseRef },
    include: { ticket: true },
  })

  if (negotiationCase?.ticket && negotiationCase.ticket.customerEmail.toLowerCase() === email.toLowerCase()) {
    try {
      await resendTicketToken(negotiationCase.ticket.id)
    } catch {
      // swallow — the caller always sees the same generic response
    }
  }
}
