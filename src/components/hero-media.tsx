"use client"

import { useReducedMotion } from "framer-motion"

// Renders the admin-uploaded hero panel media. Unlike the rest of this
// app's motion, `MotionConfig reducedMotion="user"` (src/app/layout.tsx)
// only gates `motion.*` components — it does nothing for a plain
// `<video autoPlay>` — so autoplay is gated here directly.
export default function HeroMedia({ url, mimeType }: { url: string; mimeType: string }) {
  const prefersReducedMotion = useReducedMotion()
  const isVideo = mimeType.startsWith("video/")

  if (isVideo) {
    return (
      <video
        key={url}
        src={url}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay={!prefersReducedMotion}
        loop={!prefersReducedMotion}
        muted
        playsInline
        controls={prefersReducedMotion ?? false}
        aria-label="The Negotiator in action"
      />
    )
  }

  return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
}
