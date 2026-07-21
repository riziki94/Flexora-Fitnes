/**
 * Currency display utilities for Kitozon.
 *
 * - NOK (Norwegian Krone): used when language is Norwegian (no)
 * - USD (US Dollar):       used when language is English (en)
 *
 * Conversion rate: 1 USD ≈ 10.5 NOK (approximate).
 */

import { useTranslation } from "./i18n";
import type { Language } from "./translations";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NOK: "kr",
  USD: "$",
} as const;

export const USD_CONVERSION_RATE = 10.5;

/**
 * Format a NOK amount for display in Norwegian Krone.
 * Example: 4449 → "4 449 kr"
 */
export function formatPrice(nokAmount: number): string {
  return nokAmount.toLocaleString("nb-NO") + " kr";
}

/**
 * Convert NOK to USD (approximate rate) and format as $X.XX.
 * Example: 4449 → "$423.71"
 */
export function formatPriceUsd(nokAmount: number): string {
  const usdAmount = nokAmount / USD_CONVERSION_RATE;
  return "$" + usdAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format price with "excl. VAT" suffix for customer-facing price displays.
 * @deprecated Use formatPrice or formatPriceUsd directly with t("excl. VAT") for i18n support.
 */
export function formatPriceExMva(nokAmount: number): string {
  return formatPrice(nokAmount) + " excl. VAT";
}

/**
 * Format a NOK amount in the given currency (NOK or USD).
 * Convenience wrapper that picks formatPrice or formatPriceUsd.
 */
export function formatPriceCurrency(nokAmount: number, currency: string): string {
  return currency === "NOK" ? formatPrice(nokAmount) : formatPriceUsd(nokAmount);
}

export function useCurrency() {
  return { formatPrice, formatPriceUsd, formatPriceCurrency };
}

/**
 * Combined language + currency hook.
 * Returns t (i18n), currency code (NOK/USD), and lang.
 */
export function useLanguage(): {
  t: ReturnType<typeof useTranslation>["t"];
  currency: string;
  lang: Language;
} {
  const { t, lang } = useTranslation();
  const currency = lang === "no" ? "NOK" : "USD";
  return { t, currency, lang };
}
