import { requireRole } from "@/server/auth/require-session"
import PortalShell from "@/components/portal-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"])

  return (
    <PortalShell
      title="Admin"
      sessionLabel={`${session.name} · ${session.role}`}
      nav={[
        { label: "Analytics", href: "/admin/analytics" },
        { label: "Categories", href: "/admin/categories" },
        { label: "Businesses", href: "/admin/businesses" },
        { label: "Users", href: "/admin/users" },
        { label: "Dev outbox", href: "/admin/dev/outbox" },
      ]}
    >
      {children}
    </PortalShell>
  )
}
