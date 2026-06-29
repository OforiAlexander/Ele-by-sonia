export function formatCurrency(v: number, symbol = '₵'): string {
  if (v >= 1_000_000) return `${symbol}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${symbol}${(v / 1_000).toFixed(1)}k`;
  return `${symbol}${Math.round(v)}`;
}

export function formatPrice(amount: number | string, symbol = '₵'): string {
  return `${symbol}${Number(amount).toFixed(2)}`;
}
