import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"

// New, undocumented QA-only infrastructure (see prisma/schema.prisma) —
// exists purely so magic links can be retrieved and verified in this
// sandbox without a live inbox. Admin-only; must be removed or hardened
// before a real production deploy.
export default async function DevOutboxPage() {
  const emails = await prisma.emailLog.findMany({ orderBy: { sentAt: "desc" }, take: 50 })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
        Dev outbox
      </h1>
      <p className="text-sm text-slate-500">
        Every outgoing email, logged here regardless of whether a live provider is configured.
      </p>
      <div className="bg-white rounded-xl shadow divide-y">
        {emails.map((email) => (
          <div key={email.id} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm">
                {email.template} → {email.to}
              </p>
              <Badge variant={email.providerStatus === "sent" ? "default" : "outline"}>
                {email.providerStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-2">{new Date(email.sentAt).toLocaleString()}</p>
            <p className="text-sm font-medium mb-1">{email.subject}</p>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded p-2 overflow-x-auto">
              {JSON.stringify(email.dataJson, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
