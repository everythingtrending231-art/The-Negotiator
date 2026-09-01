export function dollarsToCents(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return undefined
  return Math.round(num * 100)
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2)
}

export function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100)
}
