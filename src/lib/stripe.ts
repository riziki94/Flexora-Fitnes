// Stripe payment links — created in Stripe dashboard
// These are production-ready payment links for each plan tier.

export const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  basis: "https://buy.stripe.com/dRm6oH9EIbAYdv2dQS1Fe00",
  hybrid: "https://buy.stripe.com/7sYbJ1aIMfRe8aI3ce1Fe01",
  premium: "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe02",
  pt: "https://buy.stripe.com/bJefZh2cg7kIez60021Fe03",
};

// PT session prepayment — one-time Stripe payment link
// Price ID: price_1TuFi3DtaayjZYHTtyGeu8rR — 500 kr per session
export const PT_SESSION_PRICE_ID = "price_1TuFi3DtaayjZYHTtyGeu8rR";
export const PT_SESSION_PRICE = 500; // kr
export const PT_SESSION_PAYMENT_LINK =
  "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe03"; // placeholder — replace with real PT session payment link

export const STRIPE_CUSTOMER_PORTAL =
  "https://billing.stripe.com/p/login/placeholder";

export const FREE_TRIAL_DAYS = 30;

export const FREE_TRIAL_MESSAGE =
  "1 måned gratis prøveperiode — ingen binding, avslutt når som helst";

// PT session prepayment policy
export const PT_PREPAYMENT_POLICY =
  "Betaling trekkes med en gang. Avbud > 2 timer før: 50% refusjon. Avbud < 2 timer: ingen refusjon.";

export const PT_REFUND_PERCENT_50 = 50;
export const PT_REFUND_HOURS_THRESHOLD = 2;

export function getPaymentLink(plan: string): string {
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
