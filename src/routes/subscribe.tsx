import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SUBSCRIPTION_TIERS, type TierKey, type BillingOption } from "~/lib/subscription";
import { formatPrice } from "~/lib/currency";

type BillingMode = "oneTime" | "monthly" | "annual";

export const Route = createFileRoute("/subscribe")({
  component: SubscribePage,
});

const TIER_ORDER: TierKey[] = ["kitoslight", "zongosol", "dashboard"];

const TIER_ICONS: Record<TierKey, string> = {
  kitoslight: "",
  zongosol: "",
  dashboard: "",
};

const TIER_DESCRIPTIONS: Record<TierKey, string> = {
  kitoslight:
    "Real-time environmental data from connected devices. Map visualization, energy tracking, and air quality monitoring.",
  zongosol:
    "Full access to the container home design tool. Customize interiors, exteriors, and order your design.",
  dashboard:
    "Admin dashboard with full IP device integration. Real-time data, ESG report generation, and team access.",
};

function SubscribePage() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  return (
    <main className="flex-1 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mb-6">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of the Kitozon platform. Three subscription
            tiers that scale with your requirements — from individual homeowners to
            enterprise ESG reporting.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Velg engangs-, månedlig eller årlig
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Sikker betaling via Stripe
            </span>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setBillingMode("oneTime")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "oneTime"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Engangsbetaling
            </button>
            <button
              onClick={() => setBillingMode("monthly")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "monthly"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Månedlig
            </button>
            <button
              onClick={() => setBillingMode("annual")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "annual"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Årlig (spar 15%)
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {TIER_ORDER.map((tierKey) => {
            const tier = SUBSCRIPTION_TIERS[tierKey];
            const isPopular = tierKey === "zongosol";
            const billing = tier.billingOptions;
            const colorClasses: Record<TierKey, { bg: string; text: string; btn: string }> = {
              kitoslight: { bg: "bg-blue-100", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700" },
              zongosol: { bg: "bg-emerald-100", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" },
              dashboard: { bg: "bg-purple-100", text: "text-purple-700", btn: "bg-purple-600 hover:bg-purple-700" },
            };
            const c = colorClasses[tierKey];

            // Get active billing for CTA (Dashboard only has monthly)
            const activeBilling: BillingOption | undefined =
              billingMode === "oneTime"
                ? billing.oneTime
                : billingMode === "annual"
                  ? billing.annual
                  : billing.monthly;
            const active = activeBilling ?? billing.monthly;

            return (
              <div
                key={tierKey}
                className={`relative rounded-2xl border ${
                  isPopular
                    ? "border-emerald-300 ring-2 ring-emerald-500 shadow-lg shadow-emerald-100"
                    : "border-gray-200 shadow-sm"
                } bg-white p-8 flex flex-col`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white">
                    Mest populær
                  </span>
                )}

                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text} mb-4`}>
                  <span className="text-2xl">{TIER_ICONS[tierKey]}</span>
                </div>
                <h3 className={`text-xl font-bold ${c.text}`}>{tier.name}</h3>

                {/* All billing options visible */}
                <div className="mt-4 space-y-2 border-b border-gray-100 pb-4">
                  {billing.oneTime && (
                    <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                      billingMode === "oneTime" ? "bg-blue-50 ring-1 ring-blue-300" : ""
                    }`}>
                      <span className="text-gray-600 font-medium">Engangs</span>
                      <span className="font-bold text-gray-900">
                        {formatPrice(billing.oneTime.priceNok)}
                        <span className="text-xs text-gray-400 font-normal ml-1">eks. mva</span>
                      </span>
                    </div>
                  )}
                  <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                    billingMode === "monthly" ? "bg-emerald-50 ring-1 ring-emerald-300" : ""
                  }`}>
                    <span className="text-gray-600 font-medium">Månedlig</span>
                    <span className="font-bold text-gray-900">
                      {formatPrice(billing.monthly.priceNok)}
                      <span className="text-gray-500 font-medium">/md</span>
                      <span className="text-xs text-gray-400 font-normal ml-1">eks. mva</span>
                    </span>
                  </div>
                  {billing.annual && (
                    <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                      billingMode === "annual" ? "bg-emerald-50 ring-1 ring-emerald-300" : ""
                    }`}>
                      <span className="text-gray-600 font-medium">
                        Årlig <span className="text-xs text-emerald-600 font-bold ml-1">(-15%)</span>
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatPrice(billing.annual.priceNok)}
                        <span className="text-emerald-600 font-medium">/år</span>
                        <span className="text-xs text-emerald-500 font-normal ml-1">eks. mva</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Consultant note */}
                <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 mb-3">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {active.consultantLabel}
                </p>

                <p className="text-sm text-gray-600 leading-relaxed">
                  {TIER_DESCRIPTIONS[tierKey]}
                </p>
                <ul className="mt-4 space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={active.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block w-full rounded-xl ${c.btn} px-6 py-3 text-center text-sm font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg`}
                >
                  Abonner på {tier.name}
                </a>

                <p className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sikker betaling via Stripe
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Back to home */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Back to home
        </Link>
      </section>
    </main>
  );
}
