import { requireRole } from "@/server/auth/require-session"

export default async function NegotiatorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["NEGOTIATOR"])
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
