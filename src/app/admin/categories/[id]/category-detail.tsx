"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Category = {
  id: string
  name: string
  description: string | null
  icon: string | null
  status: string
  customerVisible: boolean
  caseCount: number
}
type Field = { id: string; fieldName: string; fieldType: string; required: boolean }
type Business = { id: string; name: string }
type AuditLogRow = { id: string; action: string; actorType: string; createdAt: string }

export default function CategoryDetail(props: {
  category: Category
  fields: Field[]
  businesses: Business[]
  auditLogs: AuditLogRow[]
}) {
  const router = useRouter()
  const c = props.category

  const [name, setName] = useState(c.name)
  const [description, setDescription] = useState(c.description ?? "")
  const [icon, setIcon] = useState(c.icon ?? "")
  const [customerVisible, setCustomerVisible] = useState(c.customerVisible)
  const [status, setStatus] = useState(c.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [fieldRequired, setFieldRequired] = useState(false)

  async function saveProfile() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, icon, customerVisible }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Couldn't save.")
      return
    }
    router.refresh()
  }

  async function saveStatus() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Couldn't change status.")
      return
    }
    router.refresh()
  }

  async function reorder(direction: "up" | "down") {
    setBusy(true)
    await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    })
    setBusy(false)
    router.refresh()
  }

  async function addField() {
    if (!fieldName.trim()) return
    setBusy(true)
    await fetch(`/api/admin/categories/${c.id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldName, fieldType, required: fieldRequired }),
    })
    setFieldName("")
    setFieldRequired(false)
    setBusy(false)
    router.refresh()
  }

  async function removeField(fieldId: string) {
    setBusy(true)
    await fetch(`/api/admin/categories/${c.id}/fields/${fieldId}`, { method: "DELETE" })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          {c.name}
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => reorder("up")}>
            ↑
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => reorder("down")}>
            ↓
          </Button>
          <Badge>{c.status}</Badge>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {props.businesses.length} businesses · {c.caseCount} cases
      </p>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Icon</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={customerVisible} onCheckedChange={(v) => setCustomerVisible(v === true)} />
          <Label>Visible to customers when active</Label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button size="sm" disabled={busy} onClick={saveProfile}>
          Save
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <Label>Status</Label>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy} onClick={saveStatus}>
            Update
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Archiving removes this category from the customer request flow immediately, without deleting any history.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Request fields
        </h2>
        <div className="space-y-2">
          {props.fields.map((field) => (
            <div key={field.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-bold text-sm">{field.fieldName}</p>
                <p className="text-xs text-slate-500">
                  {field.fieldType} {field.required ? "· required" : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeField(field.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-4 grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1 col-span-1">
            <Label>Field name</Label>
            <Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">text</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="date">date</SelectItem>
                <SelectItem value="select">select</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={fieldRequired} onCheckedChange={(v) => setFieldRequired(v === true)} />
            <Label>Required</Label>
          </div>
        </div>
        <Button size="sm" disabled={busy || !fieldName.trim()} onClick={addField}>
          Add field
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Businesses in this category
        </h2>
        {props.businesses.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
        {props.businesses.map((b) => (
          <p key={b.id} className="text-sm">
            {b.name}
          </p>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-1">
        <h2 className="font-bold mb-2" style={{ color: "#123FA9" }}>
          Audit log
        </h2>
        {props.auditLogs.map((a) => (
          <p key={a.id} className="text-xs text-slate-500">
            {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.actorType}
          </p>
        ))}
      </div>
    </div>
  )
}
