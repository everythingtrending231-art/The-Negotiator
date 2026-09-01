"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ImportResult = { created: string[]; errors: { row: number; error: string }[] }

export default function BusinessImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function pickFile(f: File | null) {
    if (f && !f.name.toLowerCase().endsWith(".csv") && f.type !== "text/csv") {
      toast.error("That doesn't look like a CSV file.")
      return
    }
    setFile(f)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return
    setSubmitting(true)
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
      toast.error(body?.error ?? "Import failed.")
      return
    }

    const parsed: ImportResult = await res.json()
    setResult(parsed)
    toast.success(`${parsed.created.length} created, ${parsed.errors.length} errors.`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Bulk import businesses</h1>
      <p className="text-sm text-ink-muted">
        CSV columns: <code>name,description,category,contactName,contactEmail,contactPhone,city,country,verificationStatus</code>.
        Category must match an existing category name exactly.
      </p>

      <Card className="p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              pickFile(e.dataTransfer.files?.[0] ?? null)
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-cobalt-600 bg-cobalt-50" : "border-border hover:border-cobalt-300"
            )}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm font-bold text-ink">{file ? file.name : "Drop a CSV file here, or click to browse"}</p>
            <p className="text-xs text-ink-muted">.csv files only</p>
          </label>
          <Button type="submit" disabled={submitting || !file}>
            {submitting ? "Importing…" : "Import"}
          </Button>
        </form>
      </Card>

      {result && (
        <Card className="p-6 space-y-3">
          <p className="text-sm font-bold">
            {result.created.length} created, {result.errors.length} errors
          </p>
          {result.errors.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((e) => (
                  <TableRow key={e.row}>
                    <TableCell>{e.row}</TableCell>
                    <TableCell className="text-red-600">{e.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      <Link href="/admin/businesses" className="text-sm underline text-cobalt-600">
        Back to businesses
      </Link>
    </div>
  )
}
