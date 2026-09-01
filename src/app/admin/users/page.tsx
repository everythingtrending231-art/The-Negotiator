import Link from "next/link"
import { prisma } from "@/server/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-cobalt-600">Users</h1>
        <Link href="/admin/users/new">
          <Button size="sm">New user</Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        {users.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="p-0">
                    <Link href={`/admin/users/${user.id}`} className="block px-4 py-3">
                      <p className="font-bold">{user.name}</p>
                      <p className="text-sm text-ink-muted">{user.email}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="p-0 text-right">
                    <Link href={`/admin/users/${user.id}`} className="flex items-center justify-end gap-2 px-4 py-3">
                      {!user.active && <Badge variant="outline">Inactive</Badge>}
                      <Badge variant="cobalt">{user.role}</Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
