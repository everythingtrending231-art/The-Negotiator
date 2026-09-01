import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BusinessVerificationStatus, Prisma } from "@prisma/client"

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>
}) {
  const { category, status } = await searchParams

  const where: Prisma.BusinessWhereInput = {}
  if (category) where.categories = { some: { categoryId: category } }
  if (status) where.verificationStatus = status as BusinessVerificationStatus

  const [businesses, categories] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: { name: "asc" },
      include: { categories: { include: { category: true } } },
    }),
    prisma.category.findMany({ orderBy: { displayOrder: "asc" } }),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Businesses
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/businesses/import">
            <Button size="sm" variant="outline">
              Bulk import
            </Button>
          </Link>
          <a href="/api/admin/businesses/export">
            <Button size="sm" variant="outline">
              Export CSV
            </Button>
          </a>
          <Link href="/admin/businesses/new">
            <Button size="sm">New business</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/businesses">
          <Badge variant={!category ? "default" : "outline"}>All categories</Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/admin/businesses?category=${c.id}`}>
            <Badge variant={category === c.id ? "default" : "outline"}>{c.name}</Badge>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {businesses.length === 0 && <p className="p-6 text-sm text-slate-500">No businesses yet.</p>}
        {businesses.map((business) => (
          <Link
            key={business.id}
            href={`/admin/businesses/${business.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-bold">{business.name}</p>
              <p className="text-sm text-slate-500">
                {business.categories.map((c) => c.category.name).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {business.publishStatus !== "PUBLISHED" && <Badge variant="outline">Unpublished</Badge>}
              <Badge>{business.verificationStatus}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
