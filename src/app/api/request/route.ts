import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { createCase } from "@/server/services/cases"
import { dollarsToCents } from "@/lib/money"
import { checkRateLimit, getClientIp } from "@/server/services/rate-limit"

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`request:${getClientIp(request)}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)

  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""

  if (!email || !categoryId || !description) {
    return NextResponse.json({ error: "email, categoryId, and description are required" }, { status: 400 })
  }

  // Attachment URLs come from the client after a direct-to-Blob upload
  // (see /api/request/upload) — validate they're actually our own Blob
  // objects rather than trusting arbitrary strings, since these get
  // rendered as links/images in internal portals later.
  const attachmentUrlsInput = Array.isArray(body?.attachmentUrls) ? body.attachmentUrls : []
  const attachmentUrls = attachmentUrlsInput
    .filter((url: unknown): url is string => typeof url === "string")
    .filter((url: string) => {
      try {
        return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")
      } catch {
        return false
      }
    })
    .slice(0, 5)

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category || !category.customerVisible || category.status !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  // Re-verify server-side rather than trusting the client — the preferred
  // business must actually be published, customer-visible, and associated
  // with the chosen category. This is a non-binding hint (see schema
  // comment on customerPreferredBusinessId), but a spoofed/unpublished
  // business id must never be persisted regardless.
  const preferredBusinessIdInput = typeof body?.businessId === "string" ? body.businessId : ""
  let customerPreferredBusinessId: string | undefined
  if (preferredBusinessIdInput) {
    const business = await prisma.business.findFirst({
      where: {
        id: preferredBusinessIdInput,
        customerVisible: true,
        publishStatus: "PUBLISHED",
        categories: { some: { categoryId } },
      },
      select: { id: true },
    })
    customerPreferredBusinessId = business?.id
  }

  const { negotiationCase } = await createCase({
    email,
    categoryId,
    description,
    url: typeof body?.url === "string" && body.url ? body.url : undefined,
    targetPriceCents: dollarsToCents(body?.targetPrice),
    maxBudgetCents: dollarsToCents(body?.maxBudget),
    quantity: typeof body?.quantity === "number" ? body.quantity : undefined,
    desiredDate: typeof body?.desiredDate === "string" && body.desiredDate ? new Date(body.desiredDate) : undefined,
    location: typeof body?.location === "string" && body.location ? body.location : undefined,
    notes: typeof body?.notes === "string" && body.notes ? body.notes : undefined,
    categoryFieldValues:
      body?.categoryFieldValues && typeof body.categoryFieldValues === "object" ? body.categoryFieldValues : undefined,
    customerPreferredBusinessId,
    attachmentUrls,
  })

  return NextResponse.json({ caseRef: negotiationCase.publicRef }, { status: 201 })
}
