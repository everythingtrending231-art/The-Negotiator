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
        { label: "Analytics", href: "/negotiator/analytics" },
      ]}
    >
      {children}
    </PortalShell>
  )
}
