"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Role } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type UserRow = { id: string; name: string; email: string; role: Role; active: boolean }

export default function EditUserForm({ actorRole, user }: { actorRole: Role; user: UserRow }) {
  const router = useRouter()
  const roleOptions: Role[] = actorRole === "SUPER_ADMIN" ? ["SUPER_ADMIN", "ADMIN", "NEGOTIATOR"] : ["NEGOTIATOR"]

  const [role, setRole] = useState<Role>(user.role)
  const [active, setActive] = useState(user.active)
  const [newPassword, setNewPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, active }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't update the user.")
      return
    }
    toast.success("User updated.")
    router.refresh()
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/admin/users/${user.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't reset the password.")
      return
    }
    setNewPassword("")
    toast.success("Password reset.")
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">{user.name}</h1>
      <p className="text-sm text-ink-muted">{user.email}</p>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Label>Active</Label>
          <Button size="sm" variant={active ? "default" : "outline"} onClick={() => setActive((v) => !v)}>
            {active ? "Active" : "Inactive"}
          </Button>
        </div>
        <Button disabled={busy} onClick={save}>
          Save
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <Label htmlFor="new-password">Reset password</Label>
        <Input
          id="new-password"
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New temporary password"
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={resetPassword}>
          Reset password
        </Button>
      </Card>
    </div>
  )
}
