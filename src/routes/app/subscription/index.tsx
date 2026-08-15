import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCurrentUser, getMySubscription } from "~/lib/user-actions";
import {
  STRIPE_CUSTOMER_PORTAL,
  FREE_TRIAL_MESSAGE,
  FREE_TRIAL_DAYS,
  getPaymentLink,
} from "~/lib/stripe";
import { useTranslation } from "~/lib/i18n";
import { BASE_PRICES } from "~/lib/currency";

export const Route = createFileRoute("/app/subscription/")({
  component: SubscriptionPage,
});

interface PlanInfo {
  key: string;
  name: string;
  price: string;
  features: string[];
}

function SubscriptionPage() {
  const navigate = useNavigate();
  const { t, formatPriceWithPeriod } = useTranslation();
  const periodSuffix = t("pricing.perMonth");

  const CLIENT_PLANS: PlanInfo[] = [
    {
      key: "basis",
      name: t("pricing.basis"),
      price: formatPriceWithPeriod(BASE_PRICES.basis, periodSuffix),
      features: [
        "Training plans",
        "Chat support",
        "Global ranking",
        "Food scanning",
        "Music integration",
        "Competitions",
      ],
    },
    {
      key: "hybrid",
      name: t("pricing.hybrid"),
      price: formatPriceWithPeriod(BASE_PRICES.hybrid, periodSuffix),
      features: [
        "Everything in Basis",
        "AI-PT coaching",
        "Create groups",
        "Arrange competitions",
      ],
    },
    {
      key: "premium",
      name: t("pricing.premium"),
      price: formatPriceWithPeriod(BASE_PRICES.premium, periodSuffix),
      features: [
        "Everything in Hybrid",
        "Live video training",
        "Movement correction",
        "Breathing measurement",
        "1-on-1 PT sessions",
      ],
    },
  ];

  const PT_PLAN: PlanInfo = {
    key: "pt",
    name: t("pricing.ptPlan"),
    price: formatPriceWithPeriod(BASE_PRICES.pt, periodSuffix),
    features: [
      "Professional verified profile",
      "Global marketing & visibility",
      "Speed date matching with clients",
      "Full access to global client base",
      "Booking & scheduling tools",
    ],
  };

  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      getCurrentUser()
        .then((u) => {
          if (!u) {
            navigate({ to: "/login" });
            return;
          }
          setUser(u);
        })
        .catch(() => {});

      // Load the real subscription from the server (honest status incl. expiry)
      getMySubscription()
        .then((sub) => setSubscription(sub))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  function handleUpgrade(planKey: string) {
    // Opens the real Stripe payment link for the plan.
    const link = getPaymentLink(planKey);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function handleCancel() {
    // No Stripe customer portal yet (needs the owner's own Stripe account + API
    // keys). Give an honest answer instead of a dead end or false promises.
    if (!STRIPE_CUSTOMER_PORTAL) {
      alert(
        "For å avslutte eller endre abonnementet, kontakt oss på support@flexorafitnes.com " +
          "så hjelper vi deg. Refusjoner behandles manuelt."
      );
    } else {
      window.open(STRIPE_CUSTOMER_PORTAL, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isExpired = subscription?.status === "expired";
  const hasSubscription = !!subscription && subscription.status !== "cancelled" && !isExpired;
  const currentPlan = subscription?.plan || "none";
  const isPt = user?.role === "pt";
  const plans = isPt ? [PT_PLAN] : CLIENT_PLANS;

  // Days left until the trial/access period ends (from the server's expires_at)
  let trialDaysLeft = 0;
  if (subscription?.expires_at && !isExpired) {
    const now = new Date().getTime();
    const expires = new Date(String(subscription.expires_at).replace(" ", "T")).getTime();
    trialDaysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
  }

  const isTrial = subscription?.status === "trial" || subscription?.status === "trialing";
  const planName = (key: string) =>
    key === "pt" ? t("pricing.ptPlan") : key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">
              Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-500">Manage your plan and billing</p>
        </div>

        {/* Trial Banner */}
        {isTrial && !isExpired && trialDaysLeft > 0 && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "dag" : "dager"} igjen av prøveperioden
                </h2>
                <p className="text-sm text-blue-100 mt-1">{FREE_TRIAL_MESSAGE}</p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-3xl font-extrabold">{trialDaysLeft}</p>
                <p className="text-xs text-blue-100">days left</p>
              </div>
            </div>
          </div>
        )}

        {/* Expired trial banner */}
        {isExpired && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Prøvetiden er over</h2>
                <p className="text-sm text-red-100 mt-1">
                  Fortsett med {planName(subscription.plan)} for å beholde alle tjenestene dine.
                </p>
              </div>
              <button
                onClick={() => handleUpgrade(subscription.plan)}
                className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Fortsett med {planName(subscription.plan)} →
              </button>
            </div>
          </div>
        )}

        {/* Current Plan */}
        {hasSubscription && (
          <div className="mb-8 rounded-xl border-2 border-[#1A56DB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Current Plan
                </span>
                <h2 className="mt-1 text-2xl font-bold text-[#1A56DB] capitalize">
                  {planName(currentPlan)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isTrial ? "🕐 Prøveperiode (gratis)" : subscription.status === "active" ? "✅ Aktiv" : `Status: ${subscription.status}`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Started: {new Date(subscription.started_at).toLocaleDateString()}
                </p>
              </div>
              <div className="hidden sm:block">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A56DB]/10">
                  <svg className="h-8 w-8 text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Subscription */}
        {!hasSubscription && !isExpired && (
          <div className="mb-8 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Active Subscription</h3>
            <p className="mb-4 text-sm text-gray-500">
              Choose a plan below to start your {FREE_TRIAL_DAYS}-day free trial. {FREE_TRIAL_MESSAGE}
            </p>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {hasSubscription ? "Change Plan" : "Choose Your Plan"}
          </h2>
          <div className={`grid gap-6 ${isPt ? "" : "md:grid-cols-3"}`}>
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`rounded-xl border-2 p-6 shadow-sm ${
                    isCurrent
                      ? "border-[#1A56DB] bg-blue-50 ring-1 ring-[#1A56DB]"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <h3 className="mb-1 text-lg font-bold text-gray-900 capitalize">
                    {plan.name}
                  </h3>
                  <p className="mb-4 text-2xl font-extrabold text-[#1A56DB]">{plan.price}</p>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent && hasSubscription ? (
                    <div className="rounded-full bg-[#1A56DB]/10 px-4 py-2.5 text-center text-sm font-semibold text-[#1A56DB]">
                      ✓ Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      className="w-full rounded-full bg-[#1A56DB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                    >
                      {isExpired ? `Fortsett med ${plan.name}` : `Choose ${plan.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancel Subscription */}
        {hasSubscription && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-red-700">Avslutt abonnement</h3>
            <p className="mb-4 text-sm text-red-600">
              Du kan avslutte når som helst — ingen binding. Skriv til
              support@flexorafitnes.com, så hjelper vi deg med kansellering og eventuell refusjon.
            </p>
            <a
              href="mailto:support@flexorafitnes.com?subject=Avslutte abonnement"
              className="inline-block rounded-full border-2 border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Kontakt support@flexorafitnes.com
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
