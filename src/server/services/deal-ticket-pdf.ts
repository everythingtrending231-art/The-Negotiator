import PDFDocument from "pdfkit"
import { formatCents } from "@/lib/money"

// Brand tokens (tailwind.config.cjs) — pdfkit has no CSS variables to pull
// from, so these are duplicated here rather than shared.
const COBALT = "#123FA9"
const AMBER_DARK = "#92590E" // amber-800 equivalent, for small print on white
const INK_MUTED = "#6B7280"

export type DealTicketPdfData = {
  publicRef: string
  businessName: string
  categoryName: string
  finalPriceCents: number
  currency: string
  includedGoods: string
  additionalBenefits: string | null
  conditions: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  validUntil: Date | null
  createdAt: Date
}

// Attached to the closure-summary email (cases.ts::sendClosureSummaryEmail)
// alongside the same link the ticket page shows — a durable copy the
// customer has even without clicking through. Plain pdfkit, not a headless
// browser reusing the HTML page's markup: no Chromium dependency to carry
// into a serverless function, and this is a fixed one-page layout anyway.
export function renderDealTicketPdf(ticket: DealTicketPdfData, qrCodePngBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.fontSize(20).fillColor(COBALT).font("Helvetica-Bold").text("The Negotiator", { continued: false })

    doc
      .fontSize(9)
      .fillColor(AMBER_DARK)
      .font("Helvetica-Bold")
      .text("DEAL TICKET", 50, 50, { align: "right" })
    doc.fontSize(11).fillColor(COBALT).font("Helvetica-Bold").text(ticket.publicRef, { align: "right" })

    doc.moveDown(1.5)
    doc.strokeColor("#E5E1D8").moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica")
    doc.text(`Business: ${ticket.businessName}`)
    doc.text(`Category: ${ticket.categoryName}`)
    doc.text(`Issued: ${ticket.createdAt.toLocaleDateString()}`)
    if (ticket.validUntil) {
      doc.text(`Valid until: ${ticket.validUntil.toLocaleDateString()}`)
    }

    doc.moveDown(1)
    doc.strokeColor("#E5E1D8").moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("AGREED PRICE")
    doc
      .fontSize(24)
      .fillColor(COBALT)
      .font("Helvetica-Bold")
      .text(formatCents(ticket.finalPriceCents, ticket.currency))

    doc.moveDown(1)
    doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("INCLUDED")
    doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica").text(ticket.includedGoods)

    if (ticket.additionalBenefits) {
      doc.moveDown(0.75)
      doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("ALSO INCLUDED")
      doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica").text(ticket.additionalBenefits)
    }

    if (ticket.conditions) {
      doc.moveDown(0.75)
      doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("CONDITIONS")
      doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica").text(ticket.conditions)
    }

    if (ticket.paymentTerms) {
      doc.moveDown(0.75)
      doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("PAYMENT")
      doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica").text(ticket.paymentTerms)
    }

    if (ticket.deliveryTerms) {
      doc.moveDown(0.75)
      doc.fontSize(9).fillColor(INK_MUTED).font("Helvetica-Bold").text("DELIVERY")
      doc.fontSize(10).fillColor("#1A1A1A").font("Helvetica").text(ticket.deliveryTerms)
    }

    doc.moveDown(1.25)
    doc.strokeColor("#E5E1D8").moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    const closingTop = doc.y
    doc
      .fontSize(10)
      .fillColor("#1A1A1A")
      .font("Helvetica")
      .text(`Present this ticket and reference ${ticket.publicRef} to ${ticket.businessName} to complete your purchase.`, 50, closingTop, {
        width: 400,
      })
    doc
      .fontSize(8)
      .fillColor(INK_MUTED)
      .font("Helvetica")
      .text(
        `Issued directly by The Negotiator. ${ticket.businessName} already confirmed these exact terms before this ticket was issued.`,
        50,
        doc.y + 6,
        { width: 400 },
      )

    doc.image(qrCodePngBuffer, 465, closingTop, { width: 80 })
    doc.fontSize(7).fillColor(INK_MUTED).font("Helvetica").text("Scan to verify", 465, closingTop + 84, { width: 80, align: "center" })

    doc.end()
  })
}
