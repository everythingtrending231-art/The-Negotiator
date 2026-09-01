export function formatPercent(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`
}

export function formatHours(hours: number | null): string {
  if (hours == null) return "—"
  if (hours < 24) return `${hours.toFixed(1)} hrs`
  return `${(hours / 24).toFixed(1)} days`
}

export function formatNumber(value: number | null): string {
  return value == null ? "—" : value.toFixed(1)
}
