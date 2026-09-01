"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { statusLabel } from "@/lib/status-badge"

const STATUSES = ["PROSPECT", "QUALIFIED", "VERIFIED", "ACTIVE", "SUSPENDED", "TERMINATED"]

// The businesses list has always accepted a `status` query param server-side
// (see page.tsx), but had no UI control to set it — this was an orphaned
// feature reachable only by hand-editing the URL.
export default function StatusFilter({ current }: { current?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL") params.delete("status")
    else params.set("status", value)
    router.push(`/admin/businesses?${params.toString()}`)
  }

  return (
    <Select value={current ?? "ALL"} onValueChange={setStatus}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {statusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
