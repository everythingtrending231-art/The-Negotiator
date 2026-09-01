import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          Users
        </h1>
        <Link href="/admin/users/new">
          <Button size="sm">New user</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/admin/users/${user.id}`}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {!user.active && <Badge variant="outline">Inactive</Badge>}
              <Badge>{user.role}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
