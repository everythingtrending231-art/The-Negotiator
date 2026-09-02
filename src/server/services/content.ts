import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

type Actor = { id: string }

export async function getContentBlocksByPage(page: string) {
  return prisma.contentBlock.findMany({
    where: { page },
    orderBy: { displayOrder: "asc" },
  })
}

export async function updateContentText(id: string, textValue: string, actor: Actor) {
  const existing = await prisma.contentBlock.findUniqueOrThrow({ where: { id } })
  if (existing.type !== "TEXT") {
    throw new Error("This content block isn't a text block.")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentBlock.update({
      where: { id },
      data: { textValue, updatedBy: actor.id },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CONTENT_BLOCK_TEXT_UPDATED",
      relatedEntityType: "ContentBlock",
      relatedEntityId: id,
      before: { textValue: existing.textValue },
      after: { textValue: updated.textValue },
      sourceChannel: "internal",
    })
    return updated
  })
}

// Called after a client-side direct-to-blob upload completes. Derives
// `type` from the uploaded MIME type, so an IMAGE block can become a VIDEO
// block on replace (and back) without a separate "change type" action.
export async function updateContentMedia(
  id: string,
  media: { url: string; mimeType: string; sizeBytes: number },
  actor: Actor,
) {
  const existing = await prisma.contentBlock.findUniqueOrThrow({ where: { id } })
  if (existing.type !== "IMAGE" && existing.type !== "VIDEO") {
    throw new Error("This content block isn't a media block.")
  }

  const nextType = media.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE"

  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentBlock.update({
      where: { id },
      data: {
        type: nextType,
        mediaUrl: media.url,
        mediaMimeType: media.mimeType,
        mediaSizeBytes: media.sizeBytes,
        updatedBy: actor.id,
      },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CONTENT_BLOCK_MEDIA_UPDATED",
      relatedEntityType: "ContentBlock",
      relatedEntityId: id,
      before: { mediaUrl: existing.mediaUrl, mediaMimeType: existing.mediaMimeType },
      after: { mediaUrl: updated.mediaUrl, mediaMimeType: updated.mediaMimeType },
      sourceChannel: "internal",
    })
    return updated
  })
}

// Reverts a media block to empty — the frontend falls back to its
// hardcoded default (e.g. the NegotiatorMark) when mediaUrl is null. Does
// NOT delete the underlying Vercel Blob object — a known, deliberate gap
// for this pass (see plan notes); it only clears the DB pointer.
export async function clearContentMedia(id: string, actor: Actor) {
  const existing = await prisma.contentBlock.findUniqueOrThrow({ where: { id } })
  if (existing.type !== "IMAGE" && existing.type !== "VIDEO") {
    throw new Error("This content block isn't a media block.")
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.contentBlock.update({
      where: { id },
      data: { mediaUrl: null, mediaMimeType: null, mediaSizeBytes: null, updatedBy: actor.id },
    })
    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "CONTENT_BLOCK_MEDIA_CLEARED",
      relatedEntityType: "ContentBlock",
      relatedEntityId: id,
      before: { mediaUrl: existing.mediaUrl },
      after: { mediaUrl: null },
      sourceChannel: "internal",
    })
    return updated
  })
}
