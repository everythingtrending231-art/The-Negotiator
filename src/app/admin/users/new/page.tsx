import { requireRole } from "@/server/auth/require-session"
import NewUserForm from "@/app/admin/users/new/new-user-form"

export default async function NewUserPage() {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"])
  return <NewUserForm actorRole={session.role} />
}
