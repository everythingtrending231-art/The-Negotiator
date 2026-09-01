interface NegotiatorMarkProps {
  size?: number
  className?: string
  // When the mark sits on a cobalt (or otherwise dark/saturated) surface,
  // the cobalt-filled disc/brim/crown otherwise vanish into the
  // background, leaving only the amber band and cream face floating —
  // this traces every shape in a thin cream line so the full mark still
  // reads.
  onDark?: boolean
}

export default function NegotiatorMark({ size = 120, className = "", onDark = false }: NegotiatorMarkProps) {
  const outline = onDark ? { stroke: "#F7F5F0", strokeWidth: 2.5 } : undefined
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="The Negotiator mark"
    >
      {/* outer o - cobalt disc */}
      <circle cx="100" cy="105" r="72" fill="#123FA9" {...outline} />
      {/* inner face - cream */}
      <circle cx="100" cy="108" r="45" fill="#F7F5F0" />
      {/* hat brim */}
      <ellipse cx="100" cy="46" rx="58" ry="8" fill="#123FA9" {...outline} />
      {/* hat crown */}
      <rect x="72" y="14" width="56" height="38" rx="6" fill="#123FA9" {...outline} />
      {/* hat band */}
      <rect x="72" y="40" width="56" height="7" fill="#F5A623" />
      {/* mustache - left wing */}
      <path
        d="M100 100 C 92 92, 78 90, 68 96 C 60 100, 56 108, 60 116 C 66 112, 78 108, 88 110 C 94 111, 98 106, 100 100 Z"
        fill="#F5A623"
      />
      {/* mustache - right wing */}
      <path
        d="M100 100 C 108 92, 122 90, 132 96 C 140 100, 144 108, 140 116 C 134 112, 122 108, 112 110 C 106 111, 102 106, 100 100 Z"
        fill="#F5A623"
      />
    </svg>
  )
}
