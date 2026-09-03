import { ImageResponse } from "next/og"

// Auto-detected by Next.js and merged into layout.tsx's openGraph/twitter
// metadata — no manual image field needed there. Kept to plain
// flexbox/text (no embedded <svg> mark) since the ImageResponse renderer
// (Satori) has only partial SVG support; this is the safe, guaranteed-to-
// render version of the brand.
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#123FA9",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: "#F7F5F0",
            letterSpacing: -2,
          }}
        >
          The Negotiator
        </div>
        <div
          style={{
            fontSize: 36,
            fontStyle: "italic",
            color: "#F5A623",
            marginTop: 20,
          }}
        >
          You ask. We negotiate.
        </div>
      </div>
    ),
    { ...size },
  )
}
