import { NextResponse } from "next/server"
import { AgreementType } from "@prisma/client"
import { requireApiSession } from "@/server/auth/require-session"
import { createPartnerAgreement } from "@/server/services/businesses"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const agreementType = typeof body?.agreementType === "string" ? body.agreementType : null
  const effectiveDate = typeof body?.effectiveDate === "string" ? body.effectiveDate : null

  if (!agreementType || !(agreementType in AgreementType) || !effectiveDate) {
    return NextResponse.json({ error: "agreementType and effectiveDate are required" }, { status: 400 })
  }

  const agreement = await createPartnerAgreement(
    id,
    {
      agreementType: agreementType as AgreementType,
      effectiveDate: new Date(effectiveDate),
      termEndDate: typeof body?.termEndDate === "string" && body.termEndDate ? new Date(body.termEndDate) : undefined,
      autoRenew: typeof body?.autoRenew === "boolean" ? body.autoRenew : undefined,
      negotiationAuthorityNotes:
        typeof body?.negotiationAuthorityNotes === "string" ? body.negotiationAuthorityNotes : undefined,
      paymentTermsText: typeof body?.paymentTermsText === "string" ? body.paymentTermsText : undefined,
      serviceLevelsText: typeof body?.serviceLevelsText === "string" ? body.serviceLevelsText : undefined,
      terminationTermsText: typeof body?.terminationTermsText === "string" ? body.terminationTermsText : undefined,
      confidentialityNotes: typeof body?.confidentialityNotes === "string" ? body.confidentialityNotes : undefined,
    },
    auth.session,
  )
  return NextResponse.json({ agreement }, { status: 201 })
}
