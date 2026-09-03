import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import CategoryDetail from "@/app/admin/categories/[id]/category-detail"

export default async function AdminCategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { displayOrder: "asc" } },
      businesses: { include: { business: true } },
      _count: { select: { cases: true } },
    },
  })
  if (!category) notFound()

  const auditLogs = await prisma.auditLog.findMany({
    where: { relatedEntityType: "Category", relatedEntityId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return (
    <CategoryDetail
      category={{
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        status: category.status,
        customerVisible: category.customerVisible,
        caseCount: category._count.cases,
      }}
      fields={category.fields.map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        required: f.required,
        fieldOptions: f.fieldOptions,
      }))}
      businesses={category.businesses.map((bc) => ({ id: bc.business.id, name: bc.business.name }))}
      auditLogs={auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  )
}
