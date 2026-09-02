import { NextResponse } from "next/server"
import { requireApiSession } from "@/server/auth/require-session"
import { updateContentText, updateContentMedia, clearContentMedia } from "@/server/services/content"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["ADMIN", "SUPER_ADMIN"])
  if ("error" in auth) return auth.error

  const { id } = await context.params
  const body = await request.json().catch(() => null)

  try {
    if (typeof body?.textValue === "string") {
      const block = await updateContentText(id, body.textValue, auth.session)
      return NextResponse.json({ block })
    }
    if (body?.clearMedia === true) {
      const block = await clearContentMedia(id, auth.session)
      return NextResponse.json({ block })
    }
    if (
      typeof body?.mediaUrl === "string" &&
      typeof body?.mediaMimeType === "string" &&
      typeof body?.mediaSizeBytes === "number"
    ) {
      const block = await updateContentMedia(
        id,
        { url: body.mediaUrl, mimeType: body.mediaMimeType, sizeBytes: body.mediaSizeBytes },
        auth.session,
      )
      return NextResponse.json({ block })
    }
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
