"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { statusLabel } from "@/lib/status-badge"
import { CaseStatus } from "@prisma/client"

const STATUSES = Object.values(CaseStatus)

export default function CaseStatusFilter({ current }: { current?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL") params.delete("status")
    else params.set("status", value)
    router.push(`/admin/cases?${params.toString()}`)
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
