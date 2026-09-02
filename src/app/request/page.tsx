import { prisma } from "@/server/db"
import RequestForm from "@/app/request/request-form"
import SiteHeader from "@/components/site-header"

export default async function RequestPage() {
  const categories = await prisma.category.findMany({
    where: { status: "ACTIVE", customerVisible: true },
    orderBy: { displayOrder: "asc" },
    include: {
      fields: { orderBy: { displayOrder: "asc" } },
      // Only businesses actually visible to customers — never leaks an
      // unpublished/prospect business into this customer-facing path (see
      // CLAUDE.md non-negotiable #3). Explicit `select` below keeps the
      // DTO to safe, public fields only — no pricing/agreement data lives
      // on Business anyway, but this is the enforcement point regardless.
      businesses: {
        where: { business: { customerVisible: true, publishStatus: "PUBLISHED" } },
        include: { business: { select: { id: true, name: true, logoUrl: true, description: true } } },
      },
    },
  })

  return (
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="font-black text-display-sm text-cobalt-600 mb-2 animate-fade-up">
          Tell us what you need.
        </h1>
        <p className="text-ink-muted mb-8 max-w-lg animate-fade-up" style={{ animationDelay: "60ms" }}>
          Your Negotiator picks this up and goes to work — we&apos;ll email you a link to track it.
        </p>
        <RequestForm
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            fields: category.fields.map((field) => ({
              id: field.id,
              fieldName: field.fieldName,
              fieldType: field.fieldType,
              required: field.required,
            })),
            businesses: category.businesses.map((bc) => ({
              id: bc.business.id,
              name: bc.business.name,
              logoUrl: bc.business.logoUrl,
              description: bc.business.description,
            })),
          }))}
        />
      </div>
    </div>
  )
}
