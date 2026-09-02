import { NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { getSession } from "@/server/auth/require-session"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]
const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
const VIDEO_EXTENSIONS = [".mp4", ".webm"]

// Client-direct-to-blob upload: the browser uploads straight to Vercel Blob
// storage using a short-lived token minted here, not through this route's
// own body — Vercel serverless functions cap request bodies well below
// what a video upload needs. This route only ever authorizes the upload
// (onBeforeGenerateToken); the actual ContentBlock row is written by
// PATCH /api/admin/content/[id], called by the client right after
// upload() resolves — see content-editor.tsx. That keeps a single write
// path (no race between this route's optional onUploadCompleted webhook,
// which can't reach localhost anyway, and the client's own call).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession()
        if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.role)) {
          throw new Error("Unauthorized")
        }

        const isVideo = VIDEO_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))

        return {
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
          // The client sends a stable pathname (content/<blockId>.<ext>) so
          // replacing a block's media reuses the same path — allow that
          // overwrite explicitly rather than requiring a fresh path (and
          // thus a fresh blob token) on every single re-upload.
          allowOverwrite: true,
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
