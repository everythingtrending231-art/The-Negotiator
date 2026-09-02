import type { ContentBlockType } from "@prisma/client"
import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

type Actor = { id: string }

type DefaultContentBlock = {
  page: string
  key: string
  adminLabel: string
  type: ContentBlockType
  textValue?: string
  displayOrder: number
}

// Single source of truth for this app's known content blocks — used both
// to self-heal a database that's missing them (see ensureDefaultContentBlocks
// below) and by prisma/seed.ts for local dev.
export const DEFAULT_CONTENT_BLOCKS: DefaultContentBlock[] = [
  { page: "landing", key: "hero.media", adminLabel: "Hero panel image or video", type: "IMAGE", displayOrder: 0 },
  {
    page: "landing",
    key: "hero.status.label",
    adminLabel: "Hero status pill",
    type: "TEXT",
    textValue: "In progress",
    displayOrder: 1,
  },
  {
    page: "landing",
    key: "hero.status.headline",
    adminLabel: "Hero status headline",
    type: "TEXT",
    textValue: "We're negotiating with the business now",
    displayOrder: 2,
  },
  {
    page: "landing",
    key: "hero.negotiator.label",
    adminLabel: "Hero negotiator card label",
    type: "TEXT",
    textValue: "Your Negotiator",
    displayOrder: 3,
  },
  {
    page: "landing",
    key: "hero.negotiator.name",
    adminLabel: "Hero negotiator card name",
    type: "TEXT",
    textValue: "Amara is on it",
    displayOrder: 4,
  },
]

// Self-heals a database that only ever ran migrations and never the
// dev-only seed script — exactly what happens in production, where
// `prisma migrate deploy` creates the table but prisma/seed.ts never runs
// there (it also creates dev login accounts with well-known passwords,
// which must never touch production). Safe to call on every read:
// skipDuplicates makes it a no-op once rows exist, and it never touches a
// block an admin has since edited.
async function ensureDefaultContentBlocks() {
  await prisma.contentBlock.createMany({
    data: DEFAULT_CONTENT_BLOCKS.map((b) => ({
      page: b.page,
      key: b.key,
      adminLabel: b.adminLabel,
      type: b.type,
      textValue: b.textValue,
      displayOrder: b.displayOrder,
    })),
    skipDuplicates: true,
  })
}

export async function getContentBlocksByPage(page: string) {
  await ensureDefaultContentBlocks()
  return prisma.contentBlock.findMany({
    where: { page },
    orderBy: { displayOrder: "asc" },
  })
}

export async function getAllContentBlocksGrouped() {
  await ensureDefaultContentBlocks()
  const blocks = await prisma.contentBlock.findMany({
    orderBy: [{ page: "asc" }, { displayOrder: "asc" }],
  })
  return blocks.reduce<Record<string, typeof blocks>>((acc, b) => {
    ;(acc[b.page] ??= []).push(b)
    return acc
  }, {})
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
