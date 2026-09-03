import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"
import { sendEmail } from "@/server/email/send"
import { getSetting } from "@/server/services/settings"

export type CreateSupportInquiryInput = {
  email: string
  message: string
  sourcePage: string
}

// The messenger widget's only action: async, human-reviewed, same as every
// other support path in this app — no live chat, no auto-reply promising a
// response time (docs/21 flags SLA targets as unresolved).
export async function createSupportInquiry(input: CreateSupportInquiryInput) {
  const inquiry = await prisma.$transaction(async (tx) => {
    const inquiry = await tx.supportInquiry.create({
      data: {
        email: input.email,
        message: input.message,
        sourcePage: input.sourcePage,
      },
    })

    await recordAudit(tx, {
      actorType: "CUSTOMER",
      action: "SUPPORT_INQUIRY_CREATED",
      relatedEntityType: "SupportInquiry",
      relatedEntityId: inquiry.id,
      after: { email: inquiry.email, sourcePage: inquiry.sourcePage },
      sourceChannel: "web",
    })

    return inquiry
  })

  await sendEmail({
    to: await getSetting("supportEmail"),
    template: "support-inquiry",
    data: {
      email: inquiry.email,
      message: inquiry.message,
      sourcePage: inquiry.sourcePage,
    },
  })

  return inquiry
}
