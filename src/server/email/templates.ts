import { formatCents } from "@/lib/money"

// Plain string templates — no react-email needed for Phase 1's simple copy
// needs. Per the brand's non-negotiable trust rule (CLAUDE.md rule 1 /
// docs/10_BRAND_BIBLE.md §16), none of these may state or imply a
// guaranteed/specific savings figure that isn't a real substantiated
// result — including in offer summaries built from seed/demo data.

export type TicketConfirmationData = {
  caseRef: string
  magicLinkUrl: string
  description: string
}

export type MagicLinkResendData = {
  caseRef: string
  magicLinkUrl: string
}

export type ClosureSummaryData = {
  caseRef: string
  status: string
  offerSummary: {
    finalPriceCents: number
    currency: string
    includedGoods: string
    businessName?: string | null
  } | null
  supportEmail: string
}

export function ticketConfirmationEmail(data: TicketConfirmationData) {
  return {
    subject: `We've got your request — ${data.caseRef}`,
    html: `
      <p>Thanks for asking — here's your negotiation ticket <strong>${data.caseRef}</strong>.</p>
      <p>What you told us: ${escapeHtml(data.description)}</p>
      <p>A real human Negotiator will pick this up shortly. Track progress and hear from them here:</p>
      <p><a href="${data.magicLinkUrl}">${data.magicLinkUrl}</a></p>
      <p>You ask. We negotiate.</p>
    `,
  }
}

export function magicLinkResendEmail(data: MagicLinkResendData) {
  return {
    subject: `Your link for ${data.caseRef}`,
    html: `
      <p>Here's a fresh link to your negotiation ticket <strong>${data.caseRef}</strong>:</p>
      <p><a href="${data.magicLinkUrl}">${data.magicLinkUrl}</a></p>
      <p>Your previous link no longer works — only this one is active now.</p>
    `,
  }
}

export function closureSummaryEmail(data: ClosureSummaryData) {
  const offerHtml = data.offerSummary
    ? `<p>Final terms: ${formatCents(data.offerSummary.finalPriceCents, data.offerSummary.currency)} — ${escapeHtml(
        data.offerSummary.includedGoods,
      )}${data.offerSummary.businessName ? ` (with ${escapeHtml(data.offerSummary.businessName)})` : ""}.</p>`
    : `<p>No offer was finalized for this case.</p>`

  return {
    subject: `Your negotiation ${data.caseRef} is closed — summary enclosed`,
    html: `
      <p>Your negotiation ticket <strong>${data.caseRef}</strong> is now <strong>${data.status}</strong>.</p>
      ${offerHtml}
      <p>This is your one-time record — the dashboard link for this case is no longer active.</p>
      <p>Questions? Reach us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    `,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
