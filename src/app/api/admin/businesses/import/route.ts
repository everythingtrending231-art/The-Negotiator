import { NextResponse } from "next/server"
import Papa from "papaparse"
import { requireApiSession } from "@/server/auth/require-session"
import { bulkImportBusinesses, type BulkImportRow } from "@/server/services/businesses"

export async function POST(request: Request) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  const csv = typeof body?.csv === "string" ? body.csv : ""

  if (!csv.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 })
  }

  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  const rows: BulkImportRow[] = parsed.data.map((row) => ({
    name: row.name?.trim() ?? "",
    description: row.description || undefined,
    category: row.category?.trim() ?? "",
    contactName: row.contactName || undefined,
    contactEmail: row.contactEmail || undefined,
    contactPhone: row.contactPhone || undefined,
    city: row.city || undefined,
    country: row.country || undefined,
    verificationStatus: row.verificationStatus || undefined,
  }))

  const result = await bulkImportBusinesses(rows, auth.session)
  return NextResponse.json(result)
}
