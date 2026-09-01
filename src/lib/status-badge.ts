import type { BadgeProps } from "@/components/ui/badge"

// One flat lookup across every status-like enum in the schema (CaseStatus,
// BusinessVerificationStatus, CategoryStatus, InviteStatus, OfferStatus,
// plus the plain-string publishStatus field). Values are unique enough in
// practice that a shared color intent per literal (ACCEPTED is always a
// good outcome, DECLINED always a negative one, etc.) holds across enums —
// no per-enum table needed.
const STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  // Draft / not yet moving
  DRAFT: "neutral",
  PROSPECT: "neutral",

  // Awaiting action — the amber "needs attention" family
  SUBMITTED: "amber",
  UNDER_REVIEW: "amber",
  ASSIGNED: "amber",
  AWAITING_BUSINESS: "amber",
  AWAITING_CUSTOMER: "amber",
  OFFER_READY: "amber",
  PENDING: "amber",
  QUALIFIED: "amber",
  PROPOSED: "amber",

  // In progress / active — cobalt
  NEGOTIATING: "cobalt",
  ACTIVE: "cobalt",
  VERIFIED: "cobalt",
  PRESENTED: "cobalt",

  // Positive / closed-won — success green
  ACCEPTED: "success",
  COMPLETED: "success",
  CLOSED: "success",
  PUBLISHED: "success",

  // Negative / needs escalation — danger red
  DECLINED: "danger",
  DISPUTED: "danger",
  TERMINATED: "danger",
  SUSPENDED: "danger",

  // Terminal / neutral — gray
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  WITHDRAWN: "neutral",
  ARCHIVED: "neutral",
  SUPERSEDED: "neutral",
  UNPUBLISHED: "neutral",
}

export function statusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  return STATUS_VARIANT[status] ?? "outline"
}

// Human-readable label for a status value — "AWAITING_BUSINESS" -> "Awaiting business".
export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
