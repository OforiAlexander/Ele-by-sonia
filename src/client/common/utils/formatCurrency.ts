export function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `₵${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `₵${(v / 1_000).toFixed(1)}k`;
  return `₵${Math.round(v)}`;
}

export function formatPrice(amount: number | string): string {
  return `₵${Number(amount).toFixed(2)}`;
}
