import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { prisma } from "@/server/db"

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET() {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const businesses = await prisma.business.findMany({
    include: { categories: { include: { category: true } }, contacts: true },
    orderBy: { name: "asc" },
  })

  const header = "name,description,category,contactName,contactEmail,contactPhone,verificationStatus,publishStatus"
  const rows = businesses.map((b) => {
    const category = b.categories[0]?.category.name ?? ""
    const primaryContact = b.contacts.find((c) => c.isPrimary) ?? b.contacts[0]
    return [
      b.name,
      b.description ?? "",
      category,
      primaryContact?.name ?? "",
      primaryContact?.email ?? "",
      primaryContact?.phone ?? "",
      b.verificationStatus,
      b.publishStatus,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  })

  const csv = [header, ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="businesses.csv"',
    },
  })
}
