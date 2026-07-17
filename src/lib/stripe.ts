// Stripe payment links — created in Stripe dashboard
// These are production-ready payment links for each plan tier.

export const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  basis: "https://buy.stripe.com/dRm6oH9EIbAYdv2dQS1Fe00",
  hybrid: "https://buy.stripe.com/7sYbJ1aIMfRe8aI3ce1Fe01",
  premium: "https://buy.stripe.com/14A3cvdUYdJ676E7su1Fe02",
  pt: "https://buy.stripe.com/bJefZh2cg7kIez60021Fe03",
};

export const STRIPE_CUSTOMER_PORTAL =
  "https://billing.stripe.com/p/login/placeholder";

export const FREE_TRIAL_DAYS = 30;

export const FREE_TRIAL_MESSAGE =
  "1 måned gratis prøveperiode — ingen binding, avslutt når som helst";

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
