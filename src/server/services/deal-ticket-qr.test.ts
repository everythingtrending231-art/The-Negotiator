import { describe, expect, it } from "vitest"
import { generateTicketQrCodeDataUrl, generateTicketQrCodePngBuffer } from "./deal-ticket-qr"

describe("generateTicketQrCodeDataUrl", () => {
  it("returns a PNG data URI", async () => {
    const dataUrl = await generateTicketQrCodeDataUrl("http://localhost:3000/deal/abc123")
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })
})

describe("generateTicketQrCodePngBuffer", () => {
  it("returns a valid PNG buffer", async () => {
    const buffer = await generateTicketQrCodePngBuffer("http://localhost:3000/deal/abc123")
    expect(Buffer.isBuffer(buffer)).toBe(true)
    // PNG magic bytes.
    expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  })

  it("produces a different code for a different URL", async () => {
    const bufferA = await generateTicketQrCodePngBuffer("http://localhost:3000/deal/token-a")
    const bufferB = await generateTicketQrCodePngBuffer("http://localhost:3000/deal/token-b")
    expect(bufferA.equals(bufferB)).toBe(false)
  })
})
