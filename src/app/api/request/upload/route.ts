import { NextResponse } from "next/server"
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { issueSignedToken } from "@vercel/blob"
import { checkRateLimit, getClientIp } from "@/server/services/rate-limit"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

// Public, unauthenticated upload endpoint for the request form — a
// customer attaches reference photos/files before the case (and any
// account) exists, so this can't gate on a session like
// /api/admin/content/upload does. Rate-limited by IP instead, and the
// signed token is scoped server-side to a fresh random pathname under
// request-attachments/ — the client never gets to choose where its file
// lands.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadPresignedBody

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async () => {
        const allowed = await checkRateLimit(`request-upload:${getClientIp(request)}`, {
          windowMs: 60 * 60 * 1000,
          max: 20,
        })
        if (!allowed) throw new Error("Too many uploads — please try again later.")

        const token = await issueSignedToken({
          pathname: `request-attachments/${crypto.randomUUID()}`,
          operations: ["put"],
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
        })

        return { token }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
