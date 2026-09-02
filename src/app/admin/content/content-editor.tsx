"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import ConfirmDialog, { useConfirmDialog } from "@/components/confirm-dialog"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024

type Block = {
  id: string
  key: string
  adminLabel: string | null
  type: "TEXT" | "IMAGE" | "VIDEO"
  textValue: string | null
  mediaUrl: string | null
  mediaMimeType: string | null
  mediaSizeBytes: number | null
}

export default function ContentEditor({ byPage }: { byPage: Record<string, Block[]> }) {
  return (
    <div className="space-y-6">
      {Object.entries(byPage).map(([page, blocks]) => (
        <Card key={page} className="p-6 space-y-4">
          <h2 className="font-bold text-cobalt-600 capitalize">{page}</h2>
          <div className="space-y-4 divide-y divide-border">
            {blocks.map((block) => (
              <div key={block.id} className="pt-4 first:pt-0">
                {block.type === "TEXT" ? (
                  <TextBlockRow block={block} />
                ) : (
                  <MediaBlockRow block={block} />
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function TextBlockRow({ block }: { block: Block }) {
  const router = useRouter()
  const [value, setValue] = useState(block.textValue ?? "")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch(`/api/admin/content/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textValue: value }),
    })
    setBusy(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't save.")
      return
    }
    toast.success("Saved.")
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Label>{block.adminLabel ?? block.key}</Label>
      <Textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="sm" disabled={busy || !value.trim()} onClick={save}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  )
}

function MediaBlockRow({ block }: { block: Block }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clearConfirm = useConfirmDialog()
  const [busy, setBusy] = useState(false)

  const isVideo = block.mediaMimeType?.startsWith("video/")

  async function handleFileSelect(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.")
      return
    }
    const cap = file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > cap) {
      toast.error(`File is too large (max ${Math.round(cap / (1024 * 1024))}MB for this type).`)
      return
    }

    setUploading(true)
    try {
      // The raw filename (spaces, unicode, etc.) becomes the blob pathname —
      // sanitize it rather than trusting whatever the OS file picker handed
      // back. Prefixed with the block id so a re-upload never collides with
      // a stale path from a previous file.
      const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
      const pathname = `content/${block.id}${extension.toLowerCase()}`
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/content/upload",
        clientPayload: block.id,
      })
      const res = await fetch(`/api/admin/content/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: blob.url, mediaMimeType: file.type, mediaSizeBytes: file.size }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? "Uploaded, but couldn't save the reference.")
        return
      }
      toast.success("Uploaded.")
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message ?? "Upload failed.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function clearMedia() {
    setBusy(true)
    const res = await fetch(`/api/admin/content/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearMedia: true }),
    })
    setBusy(false)
    clearConfirm.setOpen(false)
    if (!res.ok) {
      toast.error("Couldn't clear this media.")
      return
    }
    toast.success("Cleared — showing the default.")
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <Label>{block.adminLabel ?? block.key}</Label>
      <div className="flex items-center gap-4">
        {block.mediaUrl ? (
          isVideo ? (
            <video src={block.mediaUrl} muted loop controls className="w-32 h-32 object-cover rounded-lg bg-cream-200" />
          ) : (
            <img src={block.mediaUrl} alt="" className="w-32 h-32 object-cover rounded-lg bg-cream-200" />
          )
        ) : (
          <div className="w-32 h-32 rounded-lg bg-cream-200 border border-border flex items-center justify-center text-xs text-ink-muted text-center p-2">
            No media — showing default
          </div>
        )}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Replace"}
          </Button>
          {block.mediaUrl && (
            <Button size="sm" variant="ghost" disabled={uploading} onClick={() => clearConfirm.setOpen(true)}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={clearConfirm.open}
        onOpenChange={clearConfirm.setOpen}
        title="Clear this media?"
        description="This reverts the block to its default appearance. This cannot be undone from here."
        confirmLabel="Clear"
        destructive
        busy={busy}
        onConfirm={clearMedia}
      />
    </div>
  )
}
