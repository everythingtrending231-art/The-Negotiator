import { NextResponse } from "next/server"
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { issueSignedToken } from "@vercel/blob"
import { getSession } from "@/server/auth/require-session"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]
const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
const VIDEO_EXTENSIONS = [".mp4", ".webm"]

// Client-direct-to-blob upload: the browser uploads straight to Vercel Blob
// storage using a short-lived signed token minted here, not through this
// route's own body — Vercel serverless functions cap request bodies well
// below what a video upload needs. This route only ever authorizes the
// upload (getSignedToken); the actual ContentBlock row is written by
// PATCH /api/admin/content/[id], called by the client right after
// uploadPresigned() resolves — see content-editor.tsx.
//
// Uses the presigned/OIDC flow (issueSignedToken + handleUploadPresigned),
// not the classic BLOB_READ_WRITE_TOKEN flow (handleUpload) — this
// project's Blob store is connected in OIDC mode, which the classic flow
// can't authenticate against (it has no OIDC support at all), so it was
// rejecting every upload with a 400. The presigned flow resolves auth via
// BLOB_STORE_ID + Vercel's ambient OIDC token automatically.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadPresignedBody

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const session = await getSession()
        if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.role)) {
          throw new Error("Unauthorized")
        }

        const isVideo = VIDEO_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))

        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
        })

        return {
          token,
          // The client sends a stable pathname (content/<blockId>.<ext>) so
          // replacing a block's media reuses the same path — allow that
          // overwrite explicitly rather than requiring a fresh path on
          // every single re-upload.
          urlOptions: { allowOverwrite: true },
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
