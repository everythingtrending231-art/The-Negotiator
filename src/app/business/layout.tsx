import Link from "next/link"
import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import LogoutButton from "@/components/logout-button"

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <nav className="flex items-center gap-5 text-sm font-bold">
            <span style={{ color: "#123FA9" }}>{contact.businessName}</span>
            <Link href="/business/cases" className="text-slate-600 hover:text-slate-900">
              Cases
            </Link>
            <Link href="/business/profile" className="text-slate-600 hover:text-slate-900">
              Profile
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
