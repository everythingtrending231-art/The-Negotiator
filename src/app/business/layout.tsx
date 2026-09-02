import { requireRole, getActingBusinessContact } from "@/server/auth/require-session"
import PortalShell from "@/components/portal-shell"

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["BUSINESS"])
  const contact = await getActingBusinessContact(session)

  return (
    <PortalShell
      title={contact.businessName}
      sessionLabel={session.name}
      maxWidthClassName="max-w-4xl"
      nav={[
        { label: "Cases", href: "/business/cases" },
        { label: "Relationship", href: "/business/relationship" },
        { label: "Reports", href: "/business/reports" },
        { label: "Profile", href: "/business/profile" },
        { label: "Settings", href: "/business/settings" },
      ]}
    >
      {children}
    </PortalShell>
  )
}
