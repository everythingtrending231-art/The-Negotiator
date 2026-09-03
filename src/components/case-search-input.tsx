"use client"

import { useState, type FormEvent } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

// Submits on Enter rather than per-keystroke — avoids debounce plumbing
// while keeping every list page-driven (server component re-fetches on
// navigation), consistent with how CaseStatusFilter already works.
export default function CaseSearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get("q") ?? "")

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set("q", value.trim())
    else params.delete("q")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={submit} className="relative flex-1 min-w-[220px] max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search cases"
        className="pl-9"
      />
    </form>
  )
}
