import Link from "next/link"
import { searchCustomers } from "@/server/services/customers"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import CaseSearchInput from "@/components/case-search-input"

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const results = q?.trim() ? await searchCustomers(q) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Customers</h1>
      <p className="text-sm text-ink-muted">
        Look up a customer by email — for support and dispute investigation. Most customers never create an
        account (it&apos;s optional), so this searches ticket history first and shows account status alongside it.
      </p>

      <CaseSearchInput placeholder="Search by email…" />

      {q?.trim() && results.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">No customers match &quot;{q.trim()}&quot;.</p>
        </Card>
      )}

      <div className="space-y-4">
        {results.map((customer) => (
          <Card key={customer.email} className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">{customer.email}</p>
              {customer.account ? (
                <Badge variant="cobalt">
                  Account since {new Date(customer.account.createdAt).toLocaleDateString()}
                </Badge>
              ) : (
                <Badge variant="outline">No account</Badge>
              )}
            </div>

            {customer.tickets.length === 0 ? (
              <p className="text-sm text-ink-muted">No requests on file.</p>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {customer.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/admin/cases/${ticket.negotiationCase.id}`}
                    className="flex items-center justify-between py-3 hover:bg-cream-200 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="font-bold text-sm">
                        {ticket.negotiationCase.publicRef} · {ticket.negotiationCase.category.name}
                      </p>
                      <p className="text-xs text-ink-muted">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={ticket.negotiationCase.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
