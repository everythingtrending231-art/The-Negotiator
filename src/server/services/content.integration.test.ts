import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createUser } from "@/server/test/factories"
import {
  DEFAULT_CONTENT_BLOCKS,
  clearContentMedia,
  getContentBlocksByPage,
  updateContentMedia,
  updateContentText,
} from "./content"

describe("getContentBlocksByPage", () => {
  it("self-heals a database with no content blocks by seeding the defaults", async () => {
    const blocks = await getContentBlocksByPage("landing")
    expect(blocks.length).toBe(DEFAULT_CONTENT_BLOCKS.length)
    expect(blocks[0].key).toBe(DEFAULT_CONTENT_BLOCKS[0].key)
  })

  it("never overwrites a block an admin has already edited", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await getContentBlocksByPage("landing")
    const headline = await testPrisma.contentBlock.findFirstOrThrow({ where: { page: "landing", key: "hero.headline" } })
    await updateContentText(headline.id, "A custom edited headline", { id: admin.id })

    const blocks = await getContentBlocksByPage("landing")
    const edited = blocks.find((b) => b.key === "hero.headline")
    expect(edited?.textValue).toBe("A custom edited headline")
  })
})

describe("updateContentText", () => {
  it("updates a TEXT block's value and audits before/after", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await getContentBlocksByPage("landing")
    const block = await testPrisma.contentBlock.findFirstOrThrow({ where: { page: "landing", key: "hero.status.label" } })

    const updated = await updateContentText(block.id, "Wrapping up", { id: admin.id })
    expect(updated.textValue).toBe("Wrapping up")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "CONTENT_BLOCK_TEXT_UPDATED", relatedEntityId: block.id } })
    expect(audit).not.toBeNull()
  })

  it("refuses to text-edit a media block", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await getContentBlocksByPage("landing")
    const mediaBlock = await testPrisma.contentBlock.findFirstOrThrow({ where: { page: "landing", key: "hero.media" } })

    await expect(updateContentText(mediaBlock.id, "nope", { id: admin.id })).rejects.toThrow("isn't a text block")
  })
})

describe("updateContentMedia / clearContentMedia", () => {
  it("sets media and derives the block type from the MIME type", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await getContentBlocksByPage("landing")
    const mediaBlock = await testPrisma.contentBlock.findFirstOrThrow({ where: { page: "landing", key: "hero.media" } })

    const updated = await updateContentMedia(
      mediaBlock.id,
      { url: "https://blob.example/video.mp4", mimeType: "video/mp4", sizeBytes: 1024 },
      { id: admin.id },
    )
    expect(updated.type).toBe("VIDEO")
    expect(updated.mediaUrl).toBe("https://blob.example/video.mp4")

    await clearContentMedia(mediaBlock.id, { id: admin.id })
    const cleared = await testPrisma.contentBlock.findUniqueOrThrow({ where: { id: mediaBlock.id } })
    expect(cleared.mediaUrl).toBeNull()
  })

  it("refuses to set media on a text block", async () => {
    const admin = await createUser({ role: "ADMIN" })
    await getContentBlocksByPage("landing")
    const textBlock = await testPrisma.contentBlock.findFirstOrThrow({ where: { page: "landing", key: "hero.headline" } })

    await expect(
      updateContentMedia(textBlock.id, { url: "x", mimeType: "image/png", sizeBytes: 1 }, { id: admin.id }),
    ).rejects.toThrow("isn't a media block")
  })
})
