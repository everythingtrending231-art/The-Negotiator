"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

type Setting = { key: string; label: string; description: string; type: "text" | "number"; value: string }

export default function SettingsEditor({ settings }: { settings: Setting[] }) {
  return (
    <Card className="p-6 space-y-6 divide-y divide-border">
      {settings.map((setting, i) => (
        <div key={setting.key} className={i > 0 ? "pt-6" : ""}>
          <SettingRow setting={setting} />
        </div>
      ))}
    </Card>
  )
}

function SettingRow({ setting }: { setting: Setting }) {
  const router = useRouter()
  const [value, setValue] = useState(setting.value)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch(`/api/admin/settings/${setting.key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't save this setting.")
      return
    }
    toast.success(`${setting.label} saved.`)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`setting-${setting.key}`}>{setting.label}</Label>
      <p className="text-xs text-ink-muted">{setting.description}</p>
      <div className="flex items-center gap-2">
        <Input
          id={`setting-${setting.key}`}
          type={setting.type === "number" ? "number" : "text"}
          min={setting.type === "number" ? 1 : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" disabled={busy || !value.trim()} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
