// Stripe payment links — real links created in the Stripe dashboard (NOK).
// One honest price per plan in NOK; see src/lib/currency.ts for the plan↔link map.

import { STRIPE_LINKS_BY_CURRENCY, getStripeLink as getCurrencyStripeLink, type PlanKey } from "./currency";
import type { Language } from "./translations";

// Re-export for convenience
export { STRIPE_LINKS_BY_CURRENCY };

// Flat map of the real payment links (NOK) — same source as STRIPE_LINKS_BY_CURRENCY.
export const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  basis: STRIPE_LINKS_BY_CURRENCY.NOK.basis,
  hybrid: STRIPE_LINKS_BY_CURRENCY.NOK.hybrid,
  premium: STRIPE_LINKS_BY_CURRENCY.NOK.premium,
  pt: STRIPE_LINKS_BY_CURRENCY.NOK.pt,
};

// PT session prepayment — one-time Stripe payment link, 500 kr per session.
// Price ID: price_1TuFi3DtaayjZYHTtyGeu8rR
export const PT_SESSION_PRICE_ID = "price_1TuFi3DtaayjZYHTtyGeu8rR";
export const PT_SESSION_PRICE = 500; // kr
export const PT_SESSION_PAYMENT_LINK = "https://buy.stripe.com/6oU4gzaIM9sQfDa5km1Fe17";

// No customer portal yet — that requires the owner's own Stripe account and API
// keys (a later decision). Until then cancellations/refunds are handled honestly
// via support@flexorafitnes.com. Keep this empty on purpose.
export const STRIPE_CUSTOMER_PORTAL = "";

export const FREE_TRIAL_DAYS = 30;

export const FREE_TRIAL_MESSAGE =
  "1 month free trial — no commitment, cancel anytime";

// PT session prepayment policy
export const PT_PREPAYMENT_POLICY =
  "Betaling trekkes med en gang. Avbud > 2 timer før: 50% refusjon. Avbud < 2 timer: ingen refusjon.";

export const PT_REFUND_PERCENT_50 = 50;
export const PT_REFUND_HOURS_THRESHOLD = 2;

export function getPaymentLink(plan: string, lang?: Language): string {
  if (lang) {
    return getCurrencyStripeLink(plan, lang);
  }
  const link = STRIPE_PAYMENT_LINKS[plan.toLowerCase()];
  if (!link) {
    console.warn(`No Stripe payment link found for plan: ${plan}`);
    return STRIPE_PAYMENT_LINKS.basis;
  }
  return link;
}

export function openPaymentLink(plan: string) {
  const link = getPaymentLink(plan);
  if (typeof window !== "undefined") {
    window.open(link, "_blank", "noopener,noreferrer");
  }
}

export function openPtSessionPaymentLink(bookingId: number, forClientId: number) {
  if (typeof window === "undefined") return;
  const successUrl = `${window.location.origin}/app/bookings?payment=success&bookingId=${bookingId}`;
  const cancelUrl = `${window.location.origin}/app/bookings?payment=cancelled&bookingId=${bookingId}`;
  const paymentUrl = `${PT_SESSION_PAYMENT_LINK}?client_reference_id=booking_${bookingId}_client_${forClientId}`;
  window.open(paymentUrl, "_blank", "noopener,noreferrer");
}
