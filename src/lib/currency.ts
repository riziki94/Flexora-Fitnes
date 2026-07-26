import type { Language } from "./translations";

// ─── Currency types ────────────────────────────────────────────────────────
export type Currency = "USD" | "NOK" | "EUR";

// ─── Language → currency mapping ──────────────────────────────────────────
// EN → USD, NO → NOK, ES/FR/DE → EUR, AR/ZH → USD
export function getCurrencyForLang(lang: Language): Currency {
  switch (lang) {
    case "no":
      return "NOK";
    case "es":
    case "fr":
    case "de":
      return "EUR";
    default:
      return "USD";
  }
}

// ─── Base prices in USD cents ─────────────────────────────────────────────
export const BASE_PRICES = {
  basis: 1490,   // $14.90
  hybrid: 2490,  // $24.90
  premium: 3990, // $39.90
  pt: 1990,      // $19.90
} as const;

export type PlanKey = keyof typeof BASE_PRICES;

// ─── Fixed exchange rates ─────────────────────────────────────────────────
// 1 USD ≈ 10 NOK, 1 EUR ≈ 11 NOK  →  1 EUR ≈ 1.1 USD
const USD_TO_NOK = 10;
const EUR_TO_NOK = 11;

// ─── Conversion helpers ───────────────────────────────────────────────────

/** Convert USD cents to the target currency's cents (or whole units for NOK). */
export function convertPrice(usdCents: number, lang: Language): number {
  const currency = getCurrencyForLang(lang);
  switch (currency) {
    case "NOK":
      // Convert to whole NOK (not cents)
      return Math.round((usdCents * USD_TO_NOK) / 100);
    case "EUR":
      // Convert to EUR cents
      return Math.round((usdCents * USD_TO_NOK) / EUR_TO_NOK);
    default:
      return usdCents;
  }
}

/** Format a price (in USD cents) for the given language with proper currency symbol. */
export function formatPrice(usdCents: number, lang: Language): string {
  const currency = getCurrencyForLang(lang);
  switch (currency) {
    case "NOK": {
      const nok = Math.round((usdCents * USD_TO_NOK) / 100);
      return `${nok} kr`;
    }
    case "EUR": {
      const eurCents = Math.round((usdCents * USD_TO_NOK) / EUR_TO_NOK);
      const euros = Math.floor(eurCents / 100);
      const cents = eurCents % 100;
      return `${euros},${cents.toString().padStart(2, "0")} €`;
    }
    default: {
      // USD
      const dollars = Math.floor(usdCents / 100);
      const cents = usdCents % 100;
      return `$${dollars}.${cents.toString().padStart(2, "0")}`;
    }
  }
}

/** Format a price with a trailing "/period" suffix. */
export function formatPriceWithPeriod(
  usdCents: number,
  lang: Language,
  periodSuffix: string,
): string {
  return `${formatPrice(usdCents, lang)}${periodSuffix}`;
}

// ─── Currency-specific Stripe payment links ────────────────────────────────
// TODO: Create real Stripe payment links for each currency in Stripe dashboard.
// The existing links are assumed to be USD-based.
export const STRIPE_LINKS_BY_CURRENCY: Record<
  Currency,
  Record<PlanKey, string>
> = {
  USD: {
    basis: "https://buy.stripe.com/dRm6oH9EIbAYdv2dQS1Fe00",
    hybrid: "https://buy.stripe.com/7sYbJ1aIMfRe8aI3ce1Fe01",
    premium: "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe02",
    pt: "https://buy.stripe.com/bJefZh2cg7kIez60021Fe03",
  },
  NOK: {
    // TODO: Replace with real NOK Stripe payment links
    basis: "https://buy.stripe.com/dRm6oH9EIbAYdv2dQS1Fe00",
    hybrid: "https://buy.stripe.com/7sYbJ1aIMfRe8aI3ce1Fe01",
    premium: "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe02",
    pt: "https://buy.stripe.com/bJefZh2cg7kIez60021Fe03",
  },
  EUR: {
    // TODO: Replace with real EUR Stripe payment links
    basis: "https://buy.stripe.com/dRm6oH9EIbAYdv2dQS1Fe00",
    hybrid: "https://buy.stripe.com/7sYbJ1aIMfRe8aI3ce1Fe01",
    premium: "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe02",
    pt: "https://buy.stripe.com/bJefZh2cg7kIez60021Fe03",
  },
};

/** Get the Stripe payment link for a plan, based on the current language. */
export function getStripeLink(plan: string, lang: Language): string {
  const currency = getCurrencyForLang(lang);
  const links = STRIPE_LINKS_BY_CURRENCY[currency] ?? STRIPE_LINKS_BY_CURRENCY.USD;
  return (links as Record<string, string>)[plan] ?? links.basis ?? "#pricing";
}
