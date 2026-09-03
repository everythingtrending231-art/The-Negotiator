import { prisma } from "@/server/db"
import {
  ticketConfirmationEmail,
  magicLinkResendEmail,
  accountMagicLinkEmail,
  closureSummaryEmail,
  offerReadyEmail,
  inviteReceivedEmail,
  inviteAcceptedEmail,
  inviteDeclinedEmail,
  offerChangesRequestedEmail,
  supportInquiryEmail,
  type TicketConfirmationData,
  type MagicLinkResendData,
  type AccountMagicLinkData,
  type ClosureSummaryData,
  type OfferReadyData,
  type InviteReceivedData,
  type InviteAcceptedData,
  type InviteDeclinedData,
  type OfferChangesRequestedData,
  type SupportInquiryData,
} from "@/server/email/templates"

type TemplateMap = {
  "ticket-confirmation": TicketConfirmationData
  "magic-link-resend": MagicLinkResendData
  "account-magic-link": AccountMagicLinkData
  "closure-summary": ClosureSummaryData
  "offer-ready": OfferReadyData
  "invite-received": InviteReceivedData
  "invite-accepted": InviteAcceptedData
  "invite-declined": InviteDeclinedData
  "offer-changes-requested": OfferChangesRequestedData
  "support-inquiry": SupportInquiryData
}

export type EmailTemplate = keyof TemplateMap

function render<T extends EmailTemplate>(template: T, data: TemplateMap[T]) {
  switch (template) {
    case "ticket-confirmation":
      return ticketConfirmationEmail(data as TicketConfirmationData)
    case "magic-link-resend":
      return magicLinkResendEmail(data as MagicLinkResendData)
    case "account-magic-link":
      return accountMagicLinkEmail(data as AccountMagicLinkData)
    case "closure-summary":
      return closureSummaryEmail(data as ClosureSummaryData)
    case "offer-ready":
      return offerReadyEmail(data as OfferReadyData)
    case "invite-received":
      return inviteReceivedEmail(data as InviteReceivedData)
    case "invite-accepted":
      return inviteAcceptedEmail(data as InviteAcceptedData)
    case "invite-declined":
      return inviteDeclinedEmail(data as InviteDeclinedData)
    case "offer-changes-requested":
      return offerChangesRequestedEmail(data as OfferChangesRequestedData)
    case "support-inquiry":
      return supportInquiryEmail(data as SupportInquiryData)
    default: {
      const exhaustive: never = template
      throw new Error(`Unknown email template: ${exhaustive}`)
    }
  }
}

// Send-or-log: always records an EmailLog row so the flow is auditable and
// testable without a live inbox (see /internal/dev/outbox). Never throws
// back to the caller — a broken/missing email provider must not break the
// request/decision/resend flows it's attached to.
export async function sendEmail<T extends EmailTemplate>(input: {
  to: string
  template: T
  data: TemplateMap[T]
}): Promise<{ delivered: boolean }> {
  const { subject, html } = render(input.template, input.data)
  const apiKey = process.env.RESEND_API_KEY

  let providerStatus: "sent" | "logged_only" | "send_failed" = "logged_only"

  if (apiKey) {
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      const from = process.env.RESEND_FROM_EMAIL ?? "The Negotiator <onboarding@resend.dev>"
      const { error } = await resend.emails.send({ from, to: input.to, subject, html })
      providerStatus = error ? "send_failed" : "sent"
      if (error) {
        console.error(`[email] Resend send failed for ${input.template} -> ${input.to}:`, error)
      }
    } catch (error) {
      providerStatus = "send_failed"
      console.error(`[email] Resend send threw for ${input.template} -> ${input.to}:`, error)
    }
  } else {
    console.log(`[email:${providerStatus}] ${input.template} -> ${input.to}\nSubject: ${subject}\n${html}`)
  }

  await prisma.emailLog.create({
    data: {
      to: input.to,
      subject,
      template: input.template,
      dataJson: input.data as object,
      providerStatus,
    },
  })

  return { delivered: providerStatus === "sent" }
}
