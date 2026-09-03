import { prisma } from "@/server/db"

export type CustomerSearchResult = {
  email: string
  account: { id: string; createdAt: Date } | null
  tickets: {
    id: string
    status: string
    createdAt: Date
    negotiationCase: { id: string; publicRef: string; status: string; category: { name: string } }
  }[]
}

// Support/fraud lookup by email (docs/09's Admin "Customers" area) — not
// every customer has a CustomerAccount (most don't, since it's opt-in per
// docs/11 §6b), so this searches ticket history by email first and
// attaches account info where it exists, rather than only ever finding
// customers who happened to sign up for one.
export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const tickets = await prisma.negotiationTicket.findMany({
    where: { customerEmail: { contains: q, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customerAccount: { select: { id: true, createdAt: true } },
      negotiationCase: { select: { id: true, publicRef: true, status: true, category: { select: { name: true } } } },
    },
  })

  const byEmail = new Map<string, CustomerSearchResult>()
  for (const ticket of tickets) {
    const key = ticket.customerEmail.toLowerCase()
    if (!byEmail.has(key)) {
      byEmail.set(key, { email: ticket.customerEmail, account: ticket.customerAccount, tickets: [] })
    }
    byEmail.get(key)!.tickets.push({
      id: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
      negotiationCase: ticket.negotiationCase,
    })
  }

  // An account can exist with zero tickets (created via a login-link
  // request that never led to a submission) — those wouldn't show up
  // above at all otherwise.
  const accounts = await prisma.customerAccount.findMany({
    where: { email: { contains: q, mode: "insensitive" } },
  })
  for (const account of accounts) {
    const key = account.email.toLowerCase()
    const existing = byEmail.get(key)
    if (existing) {
      existing.account ??= account
    } else {
      byEmail.set(key, { email: account.email, account, tickets: [] })
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email))
}
