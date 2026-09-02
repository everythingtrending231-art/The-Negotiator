import Link from "next/link"
import { prisma } from "@/server/db"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Read-only, cross-business — today PartnerAgreement is only ever queried
// as "latest one per business" (admin business detail, business profile);
// this is the first place it's queried as a full list.
export default async function NegotiatorAgreementsPage() {
  const agreements = await prisma.partnerAgreement.findMany({
    orderBy: { createdAt: "desc" },
    include: { business: true },
    take: 100,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Partner agreements</h1>

      <Card className="p-0 overflow-hidden">
        {agreements.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No agreements on file yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Agreement</TableHead>
                <TableHead className="text-right">Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="p-0">
                    <Link href={`/negotiator/businesses/${a.businessId}`} className="block px-4 py-3 font-bold">
                      {a.business.name}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0">
                    <Link href={`/negotiator/businesses/${a.businessId}`} className="block px-4 py-3 text-sm text-ink-muted">
                      {a.agreementType.replaceAll("_", " ")}
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link
                      href={`/negotiator/businesses/${a.businessId}`}
                      className="block px-4 py-3 text-sm text-ink-muted"
                    >
                      {new Date(a.effectiveDate).toLocaleDateString()}
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
