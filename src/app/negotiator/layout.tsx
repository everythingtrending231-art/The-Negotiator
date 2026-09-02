import { requireRole } from "@/server/auth/require-session"
import PortalShell from "@/components/portal-shell"

export default async function NegotiatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["NEGOTIATOR"])

  return (
    <PortalShell
      title="Negotiator"
      sessionLabel={session.name}
      nav={[
        { label: "Cases", href: "/negotiator/cases" },
        { label: "Businesses", href: "/negotiator/businesses" },
        { label: "Agreements", href: "/negotiator/agreements" },
        { label: "Messages", href: "/negotiator/messages" },
        { label: "Analytics", href: "/negotiator/analytics" },
        { label: "Profile", href: "/negotiator/profile" },
      ]}
    >
      {children}
    </PortalShell>
  )
}
