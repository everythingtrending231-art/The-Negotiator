import QRCode from "qrcode"

// One per ticket — encodes buildTicketUrl(rawToken), the same branded
// ticket page a business can already cross-check against their own
// Business Portal (see DealTicket's schema comment on "verifiable").
// Scanning it is just a shortcut to the same URL already on the page/in
// the email — not a separate lookup mechanism.
const QR_OPTIONS = { margin: 1, width: 240 } as const

export async function generateTicketQrCodeDataUrl(ticketUrl: string): Promise<string> {
  return QRCode.toDataURL(ticketUrl, QR_OPTIONS)
}

export async function generateTicketQrCodePngBuffer(ticketUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketUrl, { ...QR_OPTIONS, type: "png" })
}
