"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ActorType } from "@prisma/client"

const ACTOR_TYPES = Object.values(ActorType)
const SOURCE_CHANNELS = ["web", "internal", "business", "system"]

// The one screen with no existing query-composition precedent to copy —
// every other audit query in the app is an inline findMany({ where: { caseId } }).
// Submitting always drops any existing `cursor` param, since a changed
// filter invalidates whatever page you were on.
export default function AuditFilters({
  current,
}: {
  current: { actorType?: string; action?: string; sourceChannel?: string; from?: string; to?: string; q?: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [actorType, setActorType] = useState(current.actorType ?? "ALL")
  const [action, setAction] = useState(current.action ?? "")
  const [sourceChannel, setSourceChannel] = useState(current.sourceChannel ?? "ALL")
  const [from, setFrom] = useState(current.from ?? "")
  const [to, setTo] = useState(current.to ?? "")
  const [q, setQ] = useState(current.q ?? "")

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("cursor")
    const set = (key: string, value: string, allValue = "ALL") => {
      if (!value || value === allValue) params.delete(key)
      else params.set(key, value)
    }
    set("actorType", actorType)
    set("action", action, "")
    set("sourceChannel", sourceChannel)
    set("from", from, "")
    set("to", to, "")
    set("q", q, "")
    router.push(`/admin/audit?${params.toString()}`)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
      <div className="space-y-1">
        <Label htmlFor="audit-actor-type">Actor type</Label>
        <Select value={actorType} onValueChange={setActorType}>
          <SelectTrigger id="audit-actor-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {ACTOR_TYPES.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-source-channel">Source channel</Label>
        <Select value={sourceChannel} onValueChange={setSourceChannel}>
          <SelectTrigger id="audit-source-channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {SOURCE_CHANNELS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-action">Action</Label>
        <Input id="audit-action" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. CASE_ESCALATED" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-from">From</Label>
        <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-to">To</Label>
        <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-search">Search entity type/id</Label>
        <Input id="audit-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Offer, or an entity id" />
      </div>
      <Button size="sm" onClick={apply} className="col-span-2 sm:col-span-1">
        Apply filters
      </Button>
    </div>
  )
}
