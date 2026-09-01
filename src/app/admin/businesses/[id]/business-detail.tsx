"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
type Contact = { id: string; name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean }
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

  const [description, setDescription] = useState(b.description ?? "")
  const [categoryIds, setCategoryIds] = useState<string[]>(b.categoryIds)
  const [verificationStatus, setVerificationStatus] = useState(b.verificationStatus)
  const [reasonCode, setReasonCode] = useState("")
  const [busy, setBusy] = useState(false)

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  const [note, setNote] = useState("")

  const [agreementType, setAgreementType] = useState(AGREEMENT_TYPES[0])
  const [effectiveDate, setEffectiveDate] = useState("")

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function saveProfile() {
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, categoryIds }),
    })
    setBusy(false)
    router.refresh()
  }

  async function saveVerification() {
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: verificationStatus, reasonCode: reasonCode || undefined }),
    })
    setBusy(false)
    router.refresh()
  }

  async function togglePublish() {
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishStatus: b.publishStatus === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED" }),
    })
    setBusy(false)
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
    router.refresh()
  }

  async function removeContact(contactId: string) {
    setBusy(true)
    await fetch(`/api/admin/businesses/${b.id}/contacts/${contactId}`, { method: "DELETE" })
    setBusy(false)
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
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
          {b.name}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant={b.publishStatus === "PUBLISHED" ? "default" : "outline"}>{b.publishStatus}</Badge>
          <Badge>{b.verificationStatus}</Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Profile
        </h2>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="space-y-1">
            {props.allCategories.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox checked={categoryIds.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
                <Label>{c.name}</Label>
              </div>
            ))}
          </div>
        </div>
        {b.relationshipOwnerName && <p className="text-sm text-slate-500">Owner: {b.relationshipOwnerName}</p>}
        <Button size="sm" disabled={busy} onClick={saveProfile}>
          Save
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Verification
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={verificationStatus} onValueChange={setVerificationStatus}>
            <SelectTrigger className="w-48">
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
            placeholder="Reason code (optional)"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-56"
          />
          <Button size="sm" disabled={busy} onClick={saveVerification}>
            Update
          </Button>
        </div>
        <div className="pt-2 border-t">
          <Button size="sm" variant="outline" disabled={busy} onClick={togglePublish}>
            {b.publishStatus === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
          <p className="text-xs text-slate-400 mt-1">
            Publishing is independent of verification — controls customer visibility only.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Contacts
        </h2>
        {props.contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="text-sm font-bold">
                {c.name} {c.isPrimary && <span className="text-xs text-amber-600">(primary)</span>}
              </p>
              <p className="text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeContact(c.id)}>
              Remove
            </Button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <Input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Input placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <Input placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <Button size="sm" disabled={busy || !contactName.trim()} onClick={addContact}>
          Add contact
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Partner agreement
        </h2>
        {props.latestAgreement ? (
          <p className="text-sm text-slate-600">
            Current: {props.latestAgreement.agreementType} · effective{" "}
            {new Date(props.latestAgreement.effectiveDate).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-sm text-slate-500">No agreement on file.</p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
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
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Performance (computed)
        </h2>
        <div className="text-sm text-slate-600 grid grid-cols-2 gap-1">
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
        <p className="text-xs text-slate-400">
          Offer rate approximates &quot;response rate&quot; — the schema has no dedicated response event.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-bold" style={{ color: "#123FA9" }}>
          Internal notes
        </h2>
        <p className="text-xs text-slate-400">Never visible to customers or the business.</p>
        {props.notes.map((n) => (
          <div key={n.id} className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">
              {n.authorName} · {new Date(n.createdAt).toLocaleString()}
            </p>
            <p className="text-sm">{n.body}</p>
          </div>
        ))}
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
        <Button size="sm" disabled={busy || !note.trim()} onClick={addNote}>
          Add note
        </Button>
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
