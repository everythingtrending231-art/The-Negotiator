import { prisma } from "@/server/db"
import RequestForm from "@/app/request/request-form"

export default async function RequestPage() {
  const categories = await prisma.category.findMany({
    where: { status: "ACTIVE", customerVisible: true },
    orderBy: { displayOrder: "asc" },
    include: { fields: { orderBy: { displayOrder: "asc" } } },
  })

  return (
    <div className="min-h-screen bg-[#F7F5F0] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2" style={{ color: "#123FA9" }}>
          Tell us what you need.
        </h1>
        <p className="text-slate-600 mb-8">
          A real human Negotiator picks this up and goes to work — we&apos;ll email you a link to track it.
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
          }))}
        />
      </div>
    </div>
  )
}
