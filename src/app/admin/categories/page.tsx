import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { businesses: true, cases: true } } },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Categories
        </h1>
        <Link href="/admin/categories/new">
          <Button size="sm">New category</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/admin/categories/${category.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-bold">{category.name}</p>
              <p className="text-sm text-slate-500">
                {category._count.businesses} businesses · {category._count.cases} cases
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!category.customerVisible && <Badge variant="outline">Hidden</Badge>}
              <Badge>{category.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
