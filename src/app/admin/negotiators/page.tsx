import Link from "next/link"
import { getNegotiatorWorkloads } from "@/server/services/analytics"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Sorted busiest-first by getNegotiatorWorkloads — the point of this view
// is spotting who's overloaded (or idle) at a glance, not an alphabetical
// directory (that's what /admin/users already is).
export default async function AdminNegotiatorsPage() {
  const workloads = await getNegotiatorWorkloads()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Negotiators</h1>

      <Card className="p-0 overflow-hidden">
        {workloads.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No negotiators yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negotiator</TableHead>
                <TableHead className="text-right">Open cases</TableHead>
                <TableHead className="text-right">Total cases</TableHead>
                <TableHead className="text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workloads.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/cases?negotiatorId=${w.id}`} className="block px-4 py-3">
                      <p className="font-bold text-sm">{w.name}</p>
                      <p className="text-xs text-ink-muted">{w.email ?? "No email on file"}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases?negotiatorId=${w.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
                      {w.escalatedCount > 0 && <Badge variant="danger">{w.escalatedCount} escalated</Badge>}
                      {!w.active && <Badge variant="outline">Inactive</Badge>}
                      <span className="font-bold text-sm">{w.openCaseCount}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases?negotiatorId=${w.id}`} className="block px-4 py-3 text-sm text-ink-muted">
                      {w.totalCaseCount}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/cases?negotiatorId=${w.id}`} className="block px-4 py-3 text-sm text-ink-muted">
                      {w.avgRating != null ? `${w.avgRating.toFixed(1)} / 5` : "—"}
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
