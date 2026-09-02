import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { createCase } from "@/server/services/cases"
import { dollarsToCents } from "@/lib/money"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""

  if (!email || !categoryId || !description) {
    return NextResponse.json({ error: "email, categoryId, and description are required" }, { status: 400 })
  }

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
  })

  return NextResponse.json({ caseRef: negotiationCase.publicRef }, { status: 201 })
}
