import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import StatusBadge from "@/components/status-badge"

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { businesses: true, cases: true } } },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-cobalt-600">Categories</h1>
        <Link href="/admin/categories/new">
          <Button size="sm">New category</Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No categories yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/categories/${category.id}`} className="block px-4 py-3">
                      <p className="font-bold">{category.name}</p>
                      <p className="text-sm text-ink-muted">
                        {category._count.businesses} businesses · {category._count.cases} cases
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/categories/${category.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
                      {!category.customerVisible && <Badge variant="outline">Hidden</Badge>}
                      <StatusBadge status={category.status} />
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
