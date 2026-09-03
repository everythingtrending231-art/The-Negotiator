"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StatusBadge from "@/components/status-badge"
import ConfirmDialog, { useConfirmDialog } from "@/components/confirm-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const VERIFICATION_STATUSES = ["PROSPECT", "QUALIFIED", "VERIFIED", "ACTIVE", "SUSPENDED", "TERMINATED"]
const AGREEMENT_TYPES = [
  "PERCENTAGE_DISCOUNT",
  "FIXED_NEGOTIATED_PRICE",
  "VOLUME_PRICING",
  "BUNDLE",
  "ADDED_VALUE",
  "PRIORITY_SERVICE",
  "PREFERRED_TERMS",
  "SEASONAL_ARRANGEMENT",
  "CASE_BY_CASE",
  "COMBINATION",
]

type Business = {
  id: string
  name: string
  description: string | null
  publishStatus: string
  verificationStatus: string
  customerVisible: boolean
  categoryIds: string[]
  relationshipOwnerName: string | null
}
type Contact = {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
  hasPortalAccess: boolean
}
type Note = { id: string; authorName: string; body: string; createdAt: string }
type Agreement = { id: string; agreementType: string; effectiveDate: string } | null
type Performance = {
  casesInvolvedCount: number
  offersCount: number
  offerRate: number | null
  acceptedOffersCount: number
  acceptanceRate: number | null
  disputedCasesCount: number
}
type AuditLogRow = { id: string; action: string; actorType: string; createdAt: string }

export default function BusinessDetail(props: {
  business: Business
  allCategories: { id: string; name: string }[]
  contacts: Contact[]
  notes: Note[]
  latestAgreement: Agreement
  performance: Performance
  auditLogs: AuditLogRow[]
}) {
  const router = useRouter()
  const b = props.business

  const [name, setName] = useState(b.name)
  const [description, setDescription] = useState(b.description ?? "")
  const [categoryIds, setCategoryIds] = useState<string[]>(b.categoryIds)
  const [verificationStatus, setVerificationStatus] = useState(b.verificationStatus)
  const [reasonCode, setReasonCode] = useState("")
  const [busy, setBusy] = useState(false)

  const [deleteReason, setDeleteReason] = useState("")
  const hasHistory = props.performance.casesInvolvedCount > 0 || props.performance.offersCount > 0

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  const [grantOpen, setGrantOpen] = useState<Record<string, boolean>>({})
  const [grantPassword, setGrantPassword] = useState<Record<string, string>>({})
  const [grantError, setGrantError] = useState<Record<string, string | undefined>>({})

  const [note, setNote] = useState("")

  const [agreementType, setAgreementType] = useState(AGREEMENT_TYPES[0])
  const [effectiveDate, setEffectiveDate] = useState("")

  const publishConfirm = useConfirmDialog()
  const verificationConfirm = useConfirmDialog()
  const deleteConfirm = useConfirmDialog()

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function saveProfile() {
    if (!name.trim()) return
    setBusy(true)
    const res = await fetch(`/api/admin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, categoryIds }),
    })
    setBusy(false)
    if (!res.ok) {
      toast.error("Couldn't save.")
      return
    }
    toast.success("Profile saved.")
    router.refresh()
  }

  async function deleteBusinessNow() {
    setBusy(true)
    const res = await fetch(`/api/admin/businesses/${b.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: deleteReason }),
    })
    setBusy(false)
    deleteConfirm.setOpen(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't delete this business.")
      return
    }
    toast.success("Business deleted.")
    router.push("/admin/businesses")
  }

  async function applyVerification() {
    setBusy(true)
    const res = await fetch(`/api/admin/businesses/${b.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: verificationStatus, reasonCode: reasonCode || undefined }),
    })
    setBusy(false)
    verificationConfirm.setOpen(false)
    if (!res.ok) {
      toast.error("Couldn't change status.")
      return
    }
    toast.success(`Verification status updated to ${verificationStatus}.`)
    router.refresh()
  }

  function saveVerification() {
    if (verificationStatus === b.verificationStatus) return
    verificationConfirm.setOpen(true)
  }

  async function applyTogglePublish() {
    setBusy(true)
    const nextStatus = b.publishStatus === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED"
    const res = await fetch(`/api/admin/businesses/${b.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishStatus: nextStatus }),
    })
    setBusy(false)
    publishConfirm.setOpen(false)
    if (!res.ok) {
      toast.error("Couldn't change publish status.")
      return
    }
    toast.success(nextStatus === "PUBLISHED" ? "Published — visible to customers." : "Unpublished.")
    router.refresh()
  }

  async function addContact() {
    if (!contactName.trim()) return
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: contactName, email: contactEmail || undefined, phone: contactPhone || undefined }),
    })
    setContactName("")
    setContactEmail("")
    setContactPhone("")
    setBusy(false)
    toast.success("Contact added.")
    router.refresh()
  }

  async function grantAccess(contactId: string) {
    const password = grantPassword[contactId]
    if (!password || password.length < 8) {
      setGrantError((prev) => ({ ...prev, [contactId]: "Password must be at least 8 characters" }))
      return
    }
    setBusy(true)
    setGrantError((prev) => ({ ...prev, [contactId]: undefined }))
    const res = await fetch(`/api/admin/businesses/${b.id}/contacts/${contactId}/grant-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setGrantError((prev) => ({ ...prev, [contactId]: body?.error ?? "Couldn't grant access." }))
      return
    }
    setGrantOpen((prev) => ({ ...prev, [contactId]: false }))
    toast.success("Portal access granted.")
    router.refresh()
  }

  async function removeContact(contactId: string) {
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/contacts/${contactId}`, { method: "DELETE" })
    setBusy(false)
    toast.success("Contact removed.")
    router.refresh()
  }

  async function addNote() {
    if (!note.trim()) return
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    })
    setNote("")
    setBusy(false)
    toast.success("Note added.")
    router.refresh()
  }

  async function createAgreement() {
    if (!effectiveDate) return
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/agreement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreementType, effectiveDate }),
    })
    setBusy(false)
    toast.success("Agreement recorded.")
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-cobalt-600">{b.name}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={b.publishStatus === "PUBLISHED" ? "success" : "neutral"}>{b.publishStatus}</Badge>
          <StatusBadge status={b.verificationStatus} />
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="verification">Verification &amp; contacts</TabsTrigger>
          <TabsTrigger value="agreement">Agreement &amp; performance</TabsTrigger>
          <TabsTrigger value="notes">Notes &amp; audit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Name</Label>
              <Input id="business-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-description">Description</Label>
              <Textarea id="business-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="space-y-1">
                {props.allCategories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`business-category-${c.id}`}
                      checked={categoryIds.includes(c.id)}
                      onCheckedChange={() => toggleCategory(c.id)}
                    />
                    <Label htmlFor={`business-category-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            {b.relationshipOwnerName && <p className="text-sm text-ink-muted">Owner: {b.relationshipOwnerName}</p>}
            <Button size="sm" disabled={busy || !name.trim()} onClick={saveProfile}>
              Save
            </Button>
          </Card>

          <Card className="p-6 space-y-3 border-l-4 border-l-rose-500">
            <h2 className="font-bold text-rose-700">Danger zone</h2>
            {hasHistory ? (
              <p className="text-sm text-ink-muted">
                This business has negotiation history ({props.performance.casesInvolvedCount} case
                {props.performance.casesInvolvedCount === 1 ? "" : "s"}, {props.performance.offersCount} offer
                {props.performance.offersCount === 1 ? "" : "s"}) and can&apos;t be deleted — use the Terminate
                verification status instead.
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-muted">
                  Permanently deletes this business and its contacts, notes, and agreements. A reason is required and
                  recorded in the audit log.
                </p>
                <Textarea
                  rows={2}
                  aria-label="Reason for deletion"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for deletion (required, for internal audit)"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || !deleteReason.trim()}
                  onClick={() => deleteConfirm.setOpen(true)}
                >
                  Delete business
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-cobalt-600">Verification</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                <SelectTrigger aria-label="Verification status" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="Reason code"
                placeholder="Reason code (optional)"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-56"
              />
              <Button size="sm" disabled={busy || verificationStatus === b.verificationStatus} onClick={saveVerification}>
                Update
              </Button>
            </div>
            <div className="pt-2 border-t border-border">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => publishConfirm.setOpen(true)}>
                {b.publishStatus === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
              <p className="text-xs text-ink-muted mt-1">
                Publishing is independent of verification — controls customer visibility only.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Contacts</h2>
            {props.contacts.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">
                      {c.name} {c.isPrimary && <span className="text-xs text-amber-800">(primary)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.hasPortalAccess ? (
                      <Badge variant="outline">Portal access</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setGrantOpen((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                      >
                        Grant portal access
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeContact(c.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
                {grantOpen[c.id] && !c.hasPortalAccess && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Input
                      type="password"
                      placeholder="Set a password"
                      value={grantPassword[c.id] ?? ""}
                      onChange={(e) => setGrantPassword((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    />
                    <Button size="sm" disabled={busy} onClick={() => grantAccess(c.id)}>
                      Confirm
                    </Button>
                  </div>
                )}
                {grantError[c.id] && <p className="text-xs text-red-600">{grantError[c.id]}</p>}
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <Input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <Input placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <Button size="sm" disabled={busy || !contactName.trim()} onClick={addContact}>
              Add contact
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="agreement" className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Partner agreement</h2>
            {props.latestAgreement ? (
              <p className="text-sm text-ink-soft">
                Current: {props.latestAgreement.agreementType} · effective{" "}
                {new Date(props.latestAgreement.effectiveDate).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">No agreement on file.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <Select value={agreementType} onValueChange={setAgreementType}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGREEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              <Button size="sm" disabled={busy || !effectiveDate} onClick={createAgreement}>
                Record agreement
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-2">
            <h2 className="font-bold text-cobalt-600">Performance (computed)</h2>
            <div className="text-sm text-ink-soft grid grid-cols-2 gap-1">
              <p>Cases involved: {props.performance.casesInvolvedCount}</p>
              <p>Offers made: {props.performance.offersCount}</p>
              <p>
                Offer rate:{" "}
                {props.performance.offerRate !== null ? `${Math.round(props.performance.offerRate * 100)}%` : "—"}
              </p>
              <p>
                Acceptance rate:{" "}
                {props.performance.acceptanceRate !== null
                  ? `${Math.round(props.performance.acceptanceRate * 100)}%`
                  : "—"}
              </p>
              <p>Disputed cases: {props.performance.disputedCasesCount}</p>
            </div>
            <p className="text-xs text-ink-muted">
              Offer rate approximates &quot;response rate&quot; — the schema has no dedicated response event.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-cobalt-600">Internal notes</h2>
            <p className="text-xs text-ink-muted">Never visible to customers or the business.</p>
            {props.notes.map((n) => (
              <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-ink-muted">
                  {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                </p>
                <p className="text-sm">{n.body}</p>
              </div>
            ))}
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
            <Button size="sm" disabled={busy || !note.trim()} onClick={addNote}>
              Add note
            </Button>
          </Card>

          <Card className="p-6 space-y-1">
            <h2 className="font-bold text-cobalt-600 mb-2">Audit log</h2>
            {props.auditLogs.map((a) => (
              <p key={a.id} className="text-xs text-ink-muted">
                {new Date(a.createdAt).toLocaleString()} · {a.action} · {a.actorType}
              </p>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={publishConfirm.open}
        onOpenChange={publishConfirm.setOpen}
        title={b.publishStatus === "PUBLISHED" ? "Unpublish this business?" : "Publish this business?"}
        description={
          b.publishStatus === "PUBLISHED"
            ? `"${b.name}" will stop being visible to customers and become ineligible for new negotiator invites.`
            : `"${b.name}" will become visible to customers and eligible for negotiator invites.`
        }
        confirmLabel={b.publishStatus === "PUBLISHED" ? "Unpublish" : "Publish"}
        destructive={b.publishStatus === "PUBLISHED"}
        busy={busy}
        onConfirm={applyTogglePublish}
      />
      <ConfirmDialog
        open={verificationConfirm.open}
        onOpenChange={verificationConfirm.setOpen}
        title="Change verification status?"
        description={`"${b.name}" will move from ${b.verificationStatus} to ${verificationStatus}.${reasonCode ? ` Reason: ${reasonCode}` : ""}`}
        confirmLabel="Update"
        destructive={verificationStatus === "SUSPENDED" || verificationStatus === "TERMINATED"}
        busy={busy}
        onConfirm={applyVerification}
      />
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.setOpen}
        title="Delete this business?"
        description={`"${b.name}" and its contacts, notes, and agreements will be permanently deleted. This cannot be undone. Reason: ${deleteReason}`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={deleteBusinessNow}
      />
    </div>
  )
}
