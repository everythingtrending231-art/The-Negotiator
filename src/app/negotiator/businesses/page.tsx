import Link from "next/link"
import { prisma } from "@/server/db"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"

// Read-only — negotiators have read-only access to business records
// (docs/09: "management is Admin-only"). No CRUD, no publish/verification
// controls, just the info a negotiator needs before/during a negotiation.
export default async function NegotiatorBusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { name: "asc" },
    include: { categories: { include: { category: true } } },
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Businesses</h1>

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
                    <Link href={`/negotiator/businesses/${business.id}`} className="block px-4 py-3">
                      <p className="font-bold">{business.name}</p>
                      <p className="text-sm text-ink-muted">
                        {business.categories.map((c) => c.category.name).join(", ")}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/negotiator/businesses/${business.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
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
