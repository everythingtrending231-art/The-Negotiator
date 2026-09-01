import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"
import StatusFilter from "@/app/admin/businesses/status-filter"
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
        <h1 className="text-2xl font-black text-cobalt-600">Businesses</h1>
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/admin/businesses", query: status ? { status } : {} }}>
            <Badge variant={!category ? "default" : "outline"}>All categories</Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={{ pathname: "/admin/businesses", query: { category: c.id, ...(status ? { status } : {}) } }}>
              <Badge variant={category === c.id ? "default" : "outline"}>{c.name}</Badge>
            </Link>
          ))}
        </div>
        <StatusFilter current={status} />
      </div>

      <Card className="p-0 overflow-hidden">
        {businesses.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No businesses yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/businesses/${business.id}`} className="block px-4 py-3">
                      <p className="font-bold">{business.name}</p>
                      <p className="text-sm text-ink-muted">
                        {business.categories.map((c) => c.category.name).join(", ")}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/businesses/${business.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
                      {business.publishStatus !== "PUBLISHED" && <Badge variant="outline">Unpublished</Badge>}
                      <StatusBadge status={business.verificationStatus} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
