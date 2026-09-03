import type { MetadataRoute } from "next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Only the public, unauthenticated, non-customer-specific entry points.
// /case/[token] is deliberately excluded — those URLs are per-customer
// magic links and must never be discoverable/crawlable. Staff portals
// (/admin, /negotiator, /business, /login) are excluded for the same
// "not for public discovery" reason, separate from their own auth gates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${APP_URL}/request`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/resend`, changeFrequency: "yearly", priority: 0.3 },
  ]
}
