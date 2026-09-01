"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type ImportResult = { created: string[]; errors: { row: number; error: string }[] }

export default function BusinessImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError(null)
    setResult(null)

    const csv = await file.text()
    const res = await fetch("/api/admin/businesses/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? "Import failed.")
      return
    }

    setResult(await res.json())
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black" style={{ color: "#123FA9" }}>
        Bulk import businesses
      </h1>
      <p className="text-sm text-slate-500">
        CSV columns: <code>name,description,category,contactName,contactEmail,contactPhone,city,country,verificationStatus</code>.
        Category must match an existing category name exactly.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting || !file}>
          {submitting ? "Importing…" : "Import"}
        </Button>
      </form>

      {result && (
        <div className="bg-white rounded-xl shadow p-6 space-y-2">
          <p className="text-sm font-bold">
            {result.created.length} created, {result.errors.length} errors
          </p>
          {result.errors.map((e) => (
            <p key={e.row} className="text-xs text-red-600">
              Row {e.row}: {e.error}
            </p>
          ))}
        </div>
      )}

      <Link href="/admin/businesses" className="text-sm underline text-slate-500">
        Back to businesses
      </Link>
    </div>
  )
}
