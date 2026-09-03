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

export type AccountMagicLinkData = {
  magicLinkUrl: string
  isNew: boolean
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
  feedbackUrl?: string | null
  accountUrl: string
}

export type OfferReadyData = {
  caseRef: string
  magicLinkUrl: string
}

export type InviteReceivedData = {
  caseRef: string
  portalUrl: string
}

export type InviteAcceptedData = {
  caseRef: string
  businessName: string
  portalUrl: string
}

export type InviteDeclinedData = {
  caseRef: string
  businessName: string
  note?: string | null
  portalUrl: string
}

export type OfferChangesRequestedData = {
  caseRef: string
  businessName: string
  note: string
  portalUrl: string
}

export function ticketConfirmationEmail(data: TicketConfirmationData) {
  return {
    subject: `We've got your request — ${data.caseRef}`,
    html: `
      <p>Thanks for asking — here's your negotiation ticket <strong>${data.caseRef}</strong>.</p>
      <p>What you told us: ${escapeHtml(data.description)}</p>
      <p>Your Negotiator will pick this up shortly. Track progress and hear from them here:</p>
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

export function accountMagicLinkEmail(data: AccountMagicLinkData) {
  return {
    subject: data.isNew ? "Confirm your account" : "Your account sign-in link",
    html: `
      <p>${data.isNew ? "Click below to confirm your account and see your requests in one place." : "Here's your sign-in link:"}</p>
      <p><a href="${data.magicLinkUrl}">${data.magicLinkUrl}</a></p>
      <p>This link works once and expires in an hour. If you didn't request this, you can ignore this email.</p>
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
      ${data.feedbackUrl ? `<p>Got a minute? <a href="${data.feedbackUrl}">Tell us how it went</a> — it helps us improve.</p>` : ""}
      <p>Want to track future requests in one place? <a href="${data.accountUrl}">Create a free account</a> — enter this email to get started.</p>
      <p>Questions? Reach us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    `,
  }
}

export function offerReadyEmail(data: OfferReadyData) {
  return {
    subject: `Your offer is ready to review — ${data.caseRef}`,
    html: `
      <p>Your Negotiator has a confirmed offer ready for your negotiation ticket <strong>${data.caseRef}</strong>.</p>
      <p>Review it and let us know your decision here:</p>
      <p><a href="${data.magicLinkUrl}">${data.magicLinkUrl}</a></p>
    `,
  }
}

export function inviteReceivedEmail(data: InviteReceivedData) {
  return {
    subject: `New request for your business — ${data.caseRef}`,
    html: `
      <p>A Negotiator has invited your business to a new request, <strong>${data.caseRef}</strong>.</p>
      <p>Review it in your Business Portal:</p>
      <p><a href="${data.portalUrl}">${data.portalUrl}</a></p>
    `,
  }
}

export function inviteAcceptedEmail(data: InviteAcceptedData) {
  return {
    subject: `${escapeHtml(data.businessName)} accepted your invite — ${data.caseRef}`,
    html: `
      <p><strong>${escapeHtml(data.businessName)}</strong> accepted your invite on case <strong>${data.caseRef}</strong>.</p>
      <p>Follow up to discuss terms, then draft an offer:</p>
      <p><a href="${data.portalUrl}">${data.portalUrl}</a></p>
    `,
  }
}

export function inviteDeclinedEmail(data: InviteDeclinedData) {
  return {
    subject: `${escapeHtml(data.businessName)} declined your invite — ${data.caseRef}`,
    html: `
      <p><strong>${escapeHtml(data.businessName)}</strong> declined your invite on case <strong>${data.caseRef}</strong>.</p>
      ${data.note ? `<p>Their note: &ldquo;${escapeHtml(data.note)}&rdquo;</p>` : ""}
      <p>Route this case to another business:</p>
      <p><a href="${data.portalUrl}">${data.portalUrl}</a></p>
    `,
  }
}

export function offerChangesRequestedEmail(data: OfferChangesRequestedData) {
  return {
    subject: `${escapeHtml(data.businessName)} requested changes — ${data.caseRef}`,
    html: `
      <p><strong>${escapeHtml(data.businessName)}</strong> requested changes to your drafted offer on case <strong>${data.caseRef}</strong> before they'll confirm it.</p>
      <p>Their note: &ldquo;${escapeHtml(data.note)}&rdquo;</p>
      <p>Revise the offer here:</p>
      <p><a href="${data.portalUrl}">${data.portalUrl}</a></p>
    `,
  }
}

export type SupportInquiryData = {
  email: string
  message: string
  sourcePage: string
}

// Sent to Support, not the customer — staff reply from their own inbox,
// no new reply channel. The on-page widget confirmation is the customer's
// only receipt.
export function supportInquiryEmail(data: SupportInquiryData) {
  return {
    subject: `New support message from ${data.email}`,
    html: `
      <p>New message via the site support widget.</p>
      <p>From: <strong>${escapeHtml(data.email)}</strong></p>
      <p>Page: ${escapeHtml(data.sourcePage)}</p>
      <p>Message: &ldquo;${escapeHtml(data.message)}&rdquo;</p>
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
