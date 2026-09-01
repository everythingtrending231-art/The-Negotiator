"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function NewCategoryPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("")
  const [customerVisible, setCustomerVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, icon, customerVisible }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Couldn't create the category.")
      return
    }

    router.push("/admin/categories")
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-black mb-6" style={{ color: "#123FA9" }}>
        New category
      </h1>
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">Icon (emoji or URL)</Label>
          <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="customerVisible"
            checked={customerVisible}
            onCheckedChange={(checked) => setCustomerVisible(checked === true)}
          />
          <Label htmlFor="customerVisible">Visible to customers when active</Label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating…" : "Create category"}
        </Button>
      </form>
    </div>
  )
}
