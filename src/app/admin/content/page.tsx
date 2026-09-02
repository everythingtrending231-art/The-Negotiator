import { prisma } from "@/server/db"
import ContentEditor from "@/app/admin/content/content-editor"

export default async function AdminContentPage() {
  const blocks = await prisma.contentBlock.findMany({
    orderBy: [{ page: "asc" }, { displayOrder: "asc" }],
  })

  const byPage = blocks.reduce<Record<string, typeof blocks>>((acc, b) => {
    ;(acc[b.page] ??= []).push(b)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-cobalt-600">Content</h1>
        <p className="text-sm text-ink-muted">Copy and media shown on customer-facing pages.</p>
      </div>
      <ContentEditor
        byPage={Object.fromEntries(
          Object.entries(byPage).map(([page, pageBlocks]) => [
            page,
            pageBlocks.map((b) => ({
              id: b.id,
              key: b.key,
              adminLabel: b.adminLabel,
              type: b.type,
              textValue: b.textValue,
              mediaUrl: b.mediaUrl,
              mediaMimeType: b.mediaMimeType,
              mediaSizeBytes: b.mediaSizeBytes,
            })),
          ]),
        )}
      />
    </div>
  )
}
