import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { computeBusinessPerformanceSummary } from "@/server/services/businesses"
import BusinessDetail from "@/app/admin/businesses/[id]/business-detail"

export default async function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      partnerAgreements: { orderBy: { createdAt: "desc" }, take: 1 },
      relationshipOwner: true,
    },
  })
  if (!business) notFound()

  const [allCategories, auditLogs, performance] = await Promise.all([
    prisma.category.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.auditLog.findMany({
      where: { relatedEntityType: "Business", relatedEntityId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    computeBusinessPerformanceSummary(id),
  ])

  return (
    <BusinessDetail
      business={{
        id: business.id,
        name: business.name,
        description: business.description,
        publishStatus: business.publishStatus,
        verificationStatus: business.verificationStatus,
        customerVisible: business.customerVisible,
        categoryIds: business.categories.map((c) => c.categoryId),
        relationshipOwnerName: business.relationshipOwner?.name ?? null,
      }}
      allCategories={allCategories.map((c) => ({ id: c.id, name: c.name }))}
      contacts={business.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        email: c.email,
        phone: c.phone,
        isPrimary: c.isPrimary,
      }))}
      notes={business.notes.map((n) => ({
        id: n.id,
        authorName: n.author.name,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      }))}
      latestAgreement={
        business.partnerAgreements[0]
          ? {
              id: business.partnerAgreements[0].id,
              agreementType: business.partnerAgreements[0].agreementType,
              effectiveDate: business.partnerAgreements[0].effectiveDate.toISOString(),
            }
          : null
      }
      performance={performance}
      auditLogs={auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  )
}
