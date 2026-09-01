import { Badge } from "@/components/ui/badge"
import { statusLabel, statusVariant } from "@/lib/status-badge"
import { cn } from "@/lib/utils"

// Thin wrapper so every screen renders case/verification/invite/offer
// status the same way instead of each reimplementing its own color logic.
export default function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge variant={statusVariant(status)} className={cn("font-bold", className)}>
      {statusLabel(status)}
    </Badge>
  )
}
