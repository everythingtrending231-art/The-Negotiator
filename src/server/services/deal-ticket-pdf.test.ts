import { describe, expect, it } from "vitest"
import { renderDealTicketPdf } from "./deal-ticket-pdf"
import { generateTicketQrCodePngBuffer } from "./deal-ticket-qr"

const baseTicket = {
  publicRef: "NEG-000001",
  businessName: "Test Business",
  categoryName: "Hotels",
  finalPriceCents: 15000,
  currency: "USD",
  includedGoods: "Two nights",
  additionalBenefits: null,
  conditions: null,
  paymentTerms: null,
  deliveryTerms: null,
  validUntil: null,
  createdAt: new Date("2026-01-01"),
}

describe("renderDealTicketPdf", () => {
  it("returns a valid, non-trivial PDF buffer", async () => {
    const qr = await generateTicketQrCodePngBuffer("http://localhost:3000/deal/token")
    const pdf = await renderDealTicketPdf(baseTicket, qr)

    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(1000)
  })

  it("renders successfully with every optional field populated", async () => {
    const qr = await generateTicketQrCodePngBuffer("http://localhost:3000/deal/token")
    const pdf = await renderDealTicketPdf(
      {
        ...baseTicket,
        additionalBenefits: "Free breakfast",
        conditions: "Non-refundable",
        paymentTerms: "Pay at hotel",
        deliveryTerms: "Check-in after 3pm",
        validUntil: new Date("2026-06-01"),
      },
      qr,
    )

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  })
})
