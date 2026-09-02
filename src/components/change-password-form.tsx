"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Shared self-service "change my own password" form — used by both the
// Negotiator Profile page and Business Settings page, backed by
// /api/me/password (setOwnPassword), distinct from the Admin-only
// reset-someone-else's-password path in src/server/services/users.ts.
export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!currentPassword || newPassword.length < 8) return
    setBusy(true)
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't update your password.")
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    toast.success("Password updated.")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <p className="text-xs text-ink-muted">At least 8 characters.</p>
      </div>
      <Button size="sm" disabled={busy || !currentPassword || newPassword.length < 8} onClick={submit}>
        {busy ? "Updating…" : "Update password"}
      </Button>
    </div>
  )
}
