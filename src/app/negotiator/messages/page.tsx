import Link from "next/link"
import { prisma } from "@/server/db"
import { requireRole, getActingNegotiatorId } from "@/server/auth/require-session"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Scoped as a recent-activity feed across this negotiator's assigned
// cases, not a true unread-triage inbox — Message has no readAt field,
// so there's nothing to mark read/unread yet (flagged as a future
// enhancement, not built here).
export default async function NegotiatorMessagesPage() {
  const session = await requireRole(["NEGOTIATOR"])
  const negotiatorId = await getActingNegotiatorId(session)

  const messages = await prisma.message.findMany({
    where: { case: { assignedNegotiatorId: negotiatorId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { case: { select: { id: true, publicRef: true } }, authorNegotiator: true },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600">Messages</h1>
        <p className="text-sm text-ink-muted">Recent activity across your assigned cases.</p>
      </div>

      <Card className="p-0 overflow-hidden divide-y divide-border">
        {messages.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const fromNegotiator = m.authorType === "NEGOTIATOR"
            return (
              <Link key={m.id} href={`/negotiator/cases/${m.case.id}`} className="block px-4 py-3 hover:bg-cream-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-ink-muted">{m.case.publicRef}</span>
                  <span className="text-xs text-ink-muted">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-ink-muted mb-0.5">
                  {fromNegotiator ? m.authorNegotiator?.name ?? "Negotiator" : "Customer"}
                </p>
                <p className={cn("text-sm line-clamp-2", fromNegotiator ? "text-cobalt-700" : "text-ink")}>{m.body}</p>
              </Link>
            )
          })
        )}
      </Card>
    </div>
  )
}
