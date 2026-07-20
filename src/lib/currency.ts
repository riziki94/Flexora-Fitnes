/**
 * Currency display utility for Kitozon.
 * NOTE: Temporarily always shows NOK to avoid SSR hydration errors.
 * Language-based switching (NOK/USD) will be re-enabled with proper SSR-safe implementation.
 */
export function formatPrice(nokAmount: number): string {
  return nokAmount.toLocaleString("nb-NO") + " kr";
}

/**
 * Format price with "eks. mva" suffix for customer-facing price displays.
 */
export function formatPriceExMva(nokAmount: number): string {
  return formatPrice(nokAmount) + " eks. mva";
}

export function useCurrency() {
  return { formatPrice };
}
