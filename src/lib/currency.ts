import type { Language } from "./translations";

// ─── Currency ───────────────────────────────────────────────────────────────
// The owner decided on ONE honest price per plan, charged in NOK via real
// Stripe payment links. No fictional per-language conversion: every visitor
// sees the same price in NOK — the exact amount that is charged.
export type Currency = "NOK";

// Language → currency: always NOK (one price, one currency)
export function getCurrencyForLang(_lang: Language): Currency {
  return "NOK";
}

// ─── Plan prices in NOK (whole kroner) ──────────────────────────────────────
// These match the real Stripe payment links exactly (see src/lib/stripe.ts).
export const BASE_PRICES = {
  basis: 149, // kr / month
  hybrid: 249, // kr / month
  premium: 399, // kr / month
  pt: 199, // kr / month
} as const;

export type PlanKey = keyof typeof BASE_PRICES;

// ─── Price helpers ──────────────────────────────────────────────────────────
// Prices are displayed in NOK only. Conversion helpers remain as pass-throughs
// for API compatibility, but no conversion happens anymore.

/** Return the price in NOK (whole kroner). */
export function convertPrice(nokPrice: number, _lang: Language): number {
  return nokPrice;
}

/** Format a price in NOK with the kr suffix. */
export function formatPrice(nokPrice: number, _lang?: Language): string {
  return `${nokPrice} kr`;
}

/** Format a price with a trailing "/period" suffix. */
export function formatPriceWithPeriod(
  nokPrice: number,
  lang: Language,
  periodSuffix: string,
): string {
  return `${formatPrice(nokPrice, lang)}${periodSuffix}`;
}

// ─── Real Stripe payment links (NOK, verified 2026-08-15) ───────────────────
// One set of real payment links, shown for every language. Prices in NOK.
const REAL_PAYMENT_LINKS: Record<PlanKey, string> = {
  basis: "https://buy.stripe.com/eVqeVd2cg8oM8aI6oq1Fe1a", // 149 kr
  hybrid: "https://buy.stripe.com/14A7sLcQUeNa3Us0021Fe19", // 249 kr
  premium: "https://buy.stripe.com/bJe8wP6sw8oM4YwcMO1Fe18", // 399 kr
  pt: "https://buy.stripe.com/fZu6oHaIM20o4Yw3ce1Fe16", // 199 kr
};

// Kept as a Record keyed by currency for API compatibility — every currency
// resolves to the same real NOK links (there is only one real price).
export const STRIPE_LINKS_BY_CURRENCY: Record<
  Currency,
  Record<PlanKey, string>
> = {
  NOK: { ...REAL_PAYMENT_LINKS },
};

/** Get the real Stripe payment link for a plan. */
export function getStripeLink(plan: string, _lang?: Language): string {
  const links = STRIPE_LINKS_BY_CURRENCY.NOK;
  return links[plan as PlanKey] ?? links.basis ?? "#pricing";
}
