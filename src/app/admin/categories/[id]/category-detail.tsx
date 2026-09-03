"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import StatusBadge from "@/components/status-badge"
import ConfirmDialog, { useConfirmDialog } from "@/components/confirm-dialog"
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

  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [fieldRequired, setFieldRequired] = useState(false)

  const archiveConfirm = useConfirmDialog()
  const removeFieldConfirm = useConfirmDialog()
  const [pendingRemoveField, setPendingRemoveField] = useState<Field | null>(null)

  async function saveProfile() {
    setBusy(true)
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, icon, customerVisible }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't save.")
      return
    }
    toast.success("Profile saved.")
    router.refresh()
  }

  async function applyStatus(nextStatus: string) {
    setBusy(true)
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
    setBusy(false)
    archiveConfirm.setOpen(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't change status.")
      return
    }
    toast.success(`Status updated to ${nextStatus}.`)
    router.refresh()
  }

  function saveStatus() {
    if (status === "ARCHIVED" && c.status !== "ARCHIVED") {
      archiveConfirm.setOpen(true)
      return
    }
    applyStatus(status)
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
    toast.success("Field added.")
    router.refresh()
  }

  function requestRemoveField(field: Field) {
    setPendingRemoveField(field)
    removeFieldConfirm.setOpen(true)
  }

  async function confirmRemoveField() {
    if (!pendingRemoveField) return
    setBusy(true)
    await fetch(`/api/admin/categories/${c.id}/fields/${pendingRemoveField.id}`, { method: "DELETE" })
    setBusy(false)
    removeFieldConfirm.setOpen(false)
    toast.success(`Removed "${pendingRemoveField.fieldName}".`)
    setPendingRemoveField(null)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-cobalt-600">{c.name}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" aria-label="Move up" disabled={busy} onClick={() => reorder("up")}>
            ↑
          </Button>
          <Button size="sm" variant="outline" aria-label="Move down" disabled={busy} onClick={() => reorder("down")}>
            ↓
          </Button>
          <StatusBadge status={c.status} />
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        {props.businesses.length} businesses · {c.caseCount} cases
      </p>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category-name">Name</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-description">Description</Label>
          <Textarea id="category-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-icon">Icon</Label>
          <Input id="category-icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="customerVisible" checked={customerVisible} onCheckedChange={(v) => setCustomerVisible(v === true)} />
          <Label htmlFor="customerVisible">Visible to customers when active</Label>
        </div>
        <Button size="sm" disabled={busy} onClick={saveProfile}>
          Save
        </Button>
      </Card>

      <Card className="p-6 space-y-3">
        <Label htmlFor="category-status">Status</Label>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="category-status" className="w-48">
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
        <p className="text-xs text-ink-muted">
          Archiving removes this category from the customer request flow immediately, without deleting any history.
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-cobalt-600">Request fields</h2>
        <div className="space-y-2">
          {props.fields.map((field) => (
            <div key={field.id} className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <p className="font-bold text-sm">{field.fieldName}</p>
                <p className="text-xs text-ink-muted">
                  {field.fieldType} {field.required ? "· required" : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => requestRemoveField(field)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1 col-span-1">
            <Label htmlFor="new-field-name">Field name</Label>
            <Input id="new-field-name" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-field-type">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="new-field-type">
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
            <Checkbox id="fieldRequired" checked={fieldRequired} onCheckedChange={(v) => setFieldRequired(v === true)} />
            <Label htmlFor="fieldRequired">Required</Label>
          </div>
        </div>
        <Button size="sm" disabled={busy || !fieldName.trim()} onClick={addField}>
          Add field
        </Button>
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="font-bold text-cobalt-600">Businesses in this category</h2>
        {props.businesses.length === 0 && <p className="text-sm text-ink-muted">None yet.</p>}
        {props.businesses.map((b) => (
          <Link key={b.id} href={`/admin/businesses/${b.id}`} className="block text-sm text-cobalt-600 hover:underline">
            {b.name}
          </Link>
        ))}
      </Card>

      <Card className="p-6 space-y-1">
        <h2 className="font-bold text-cobalt-600 mb-2">Audit log</h2>
        {props.auditLogs.map((a) => (
          <p key={a.id} className="text-xs text-ink-muted">
            {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.actorType}
          </p>
        ))}
      </Card>

      <ConfirmDialog
        open={archiveConfirm.open}
        onOpenChange={archiveConfirm.setOpen}
        title="Archive this category?"
        description={`"${c.name}" will be removed from the customer request flow immediately, without deleting any history.`}
        confirmLabel="Archive"
        busy={busy}
        onConfirm={() => applyStatus("ARCHIVED")}
      />
      <ConfirmDialog
        open={removeFieldConfirm.open}
        onOpenChange={removeFieldConfirm.setOpen}
        title="Remove this field?"
        description={
          pendingRemoveField
            ? `"${pendingRemoveField.fieldName}" will no longer appear on the customer request form for this category.`
            : ""
        }
        confirmLabel="Remove"
        busy={busy}
        onConfirm={confirmRemoveField}
      />
    </div>
  )
}
