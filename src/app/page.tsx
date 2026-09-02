import { getContentBlocksByPage } from "@/server/services/content"
import HomePageClient from "@/app/home-page-client"

// Content is admin-editable (Admin → Content) and must reflect immediately,
// not just after the next production build/deploy — force dynamic
// rendering so this always fetches fresh instead of getting statically
// prerendered at build time.
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const blocks = await getContentBlocksByPage("landing")
  const byKey = Object.fromEntries(blocks.map((b) => [b.key, b]))

  const heroMediaBlock = byKey["hero.media"]

  return (
    <HomePageClient
      heroMedia={
        heroMediaBlock?.mediaUrl
          ? { url: heroMediaBlock.mediaUrl, mimeType: heroMediaBlock.mediaMimeType ?? "" }
          : null
      }
      statusLabel={byKey["hero.status.label"]?.textValue ?? "In progress"}
      statusHeadline={byKey["hero.status.headline"]?.textValue ?? "We're negotiating with the business now"}
      negotiatorLabel={byKey["hero.negotiator.label"]?.textValue ?? "Your Negotiator"}
      negotiatorName={byKey["hero.negotiator.name"]?.textValue ?? "Amara is on it"}
      badge={byKey["hero.badge"]?.textValue ?? "#DontAcceptTheFirstOffer"}
      headline={byKey["hero.headline"]?.textValue ?? "Don't take\nthe first price."}
      subheading={
        byKey["hero.subheading"]?.textValue ??
        "Tell us what you're trying to buy, book, or get. Your Negotiator goes to work on it — you decide when the offer comes back."
      }
      ctaPrimary={byKey["hero.cta.primary"]?.textValue ?? "Negotiate This For Me"}
      ctaSecondary={byKey["hero.cta.secondary"]?.textValue ?? "See how it works"}
      valueBadges={[
        byKey["hero.valueBadge.1"]?.textValue ?? "Lower Price",
        byKey["hero.valueBadge.2"]?.textValue ?? "Better Terms",
        byKey["hero.valueBadge.3"]?.textValue ?? "Added Value",
      ]}
    />
  )
}
