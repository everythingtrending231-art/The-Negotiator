import { Badge } from "@/components/ui/badge"
import { statusLabel, statusVariant } from "@/lib/status-badge"
import { cn } from "@/lib/utils"

// Thin wrapper so every screen renders case/verification/invite/offer
// status the same way instead of each reimplementing its own color logic.
export default function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  // Override the rendered text while still color-coding by `status` — for
  // callers that want to append a count or other detail (e.g. "Submitted: 3").
  label?: string
  className?: string
}) {
  return (
    <Badge variant={statusVariant(status)} className={cn("font-bold", className)}>
      {label ?? statusLabel(status)}
    </Badge>
  )
}
