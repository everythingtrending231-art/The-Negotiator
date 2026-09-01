import { notFound } from "next/navigation"
import { prisma } from "@/server/db"
import { requireRole } from "@/server/auth/require-session"
import EditUserForm from "@/app/admin/users/[id]/edit-user-form"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"])

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) notFound()

  return (
    <EditUserForm
      actorRole={session.role}
      user={{ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active }}
    />
  )
}
