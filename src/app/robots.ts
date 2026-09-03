import type { MetadataRoute } from "next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// /case/ is the important one here: those are per-customer magic-link
// URLs, and a search engine indexing one would be a real exposure, not
// just noise — disallowing it is defense-in-depth on top of the tokens
// themselves being unguessable. Staff portals and /api are excluded for
// the same "not for public discovery" reason, on top of their own auth.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/request", "/resend"],
      disallow: ["/admin", "/negotiator", "/business", "/login", "/case", "/api"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
