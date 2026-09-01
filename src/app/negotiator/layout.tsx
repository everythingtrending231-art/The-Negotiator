import Link from "next/link"
import { requireRole } from "@/server/auth/require-session"
import LogoutButton from "@/components/logout-button"

export default async function NegotiatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["NEGOTIATOR"])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <nav className="flex items-center gap-5 text-sm font-bold">
            <span style={{ color: "#123FA9" }}>Negotiator</span>
            <Link href="/negotiator/cases" className="text-slate-600 hover:text-slate-900">
              Cases
            </Link>
            <Link href="/negotiator/analytics" className="text-slate-600 hover:text-slate-900">
              Analytics
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{session.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div>{children}</div>
    </div>
  )
}
