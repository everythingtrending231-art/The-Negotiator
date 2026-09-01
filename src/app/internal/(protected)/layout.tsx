import { redirect } from "next/navigation"
import { requireInternalSession } from "@/server/require-internal-session"

export default async function InternalProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireInternalSession())) {
    redirect("/internal/login")
  }

  return <div className="min-h-screen bg-slate-50">{children}</div>
}
