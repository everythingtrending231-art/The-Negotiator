import { getCustomerAccountSession } from "@/server/auth/customer-session"
import { getAccountTickets } from "@/server/services/customer-accounts"
import SiteHeader from "@/components/site-header"
import AccountSignInForm from "@/app/account/account-sign-in-form"
import AccountTicketList from "@/app/account/account-ticket-list"

export default async function AccountPage() {
  const session = await getCustomerAccountSession()

  if (!session) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-12">
          <AccountSignInForm />
        </div>
      </div>
    )
  }

  const tickets = await getAccountTickets(session.id)

  return (
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-black text-display-sm text-cobalt-600">Your requests</h1>
        </div>
        <p className="text-ink-muted mb-8">Signed in as {session.email}</p>
        <AccountTicketList
          tickets={tickets.map((t) => ({
            id: t.id,
            status: t.status,
            caseStatus: t.negotiationCase.status,
            publicRef: t.negotiationCase.publicRef,
            categoryName: t.negotiationCase.category.name,
            createdAt: t.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
