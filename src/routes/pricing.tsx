import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SUBSCRIPTION_TIERS, type TierKey, type BillingOption } from "~/lib/subscription";
import { formatPrice, formatPriceUsd } from "~/lib/currency";
import { useLanguage } from "~/lib/i18n.tsx";

type BillingMode = "oneTime" | "monthly" | "annual";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const TIER_ORDER: TierKey[] = ["kitoslight", "zongosol", "dashboard"];

const TIER_DESCRIPTIONS: Record<TierKey, string> = {
  kitoslight:
    "Real-time environmental monitoring with map visualization, CO₂ and gas measurement, energy production and IP device integration.",
  zongosol:
    "Complete container home design tool with 3D visualization, custom room solutions, material selection and ordering.",
  dashboard:
    "Full admin dashboard with IP integration of all devices, real-time data, ESG report generation and team management.",
};

const TIER_COLORS: Record<
  TierKey,
  {
    bg: string;
    text: string;
    btn: string;
    border: string;
    accent: string;
    badge: string;
    ring: string;
    gradient: string;
  }
> = {
  kitoslight: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    border: "border-blue-200",
    accent: "bg-blue-600",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-500",
    gradient: "from-blue-500 to-sky-400",
  },
  zongosol: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    border: "border-emerald-300",
    accent: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-500",
    gradient: "from-emerald-500 to-green-400",
  },
  dashboard: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
    border: "border-purple-200",
    accent: "bg-purple-600",
    badge: "bg-purple-100 text-purple-700",
    ring: "ring-purple-500",
    gradient: "from-purple-500 to-indigo-400",
  },
};

function PricingPage() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const { t, currency } = useLanguage();
  const isNok = currency === "NOK";

  return (
    <main className="flex-1 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
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
            {t("Pricing & Subscriptions")}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {t("Choose the product and payment model that fits you. Secure payment via Stripe — one-time payment or subscription.")}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setBillingMode("oneTime")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "oneTime"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("One-time payment")}
            </button>
            <button
              onClick={() => setBillingMode("monthly")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "monthly"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("Monthly")}
            </button>
            <button
              onClick={() => setBillingMode("annual")}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                billingMode === "annual"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("Yearly (save 15%)")}
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {TIER_ORDER.map((tierKey) => {
            const tier = SUBSCRIPTION_TIERS[tierKey];
            const isPopular = tierKey === "zongosol";
            const colors = TIER_COLORS[tierKey];
            const billing = tier.billingOptions;

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
                className={`relative rounded-2xl border-2 ${
                  isPopular
                    ? "border-emerald-400 ring-4 ring-emerald-200 shadow-xl shadow-emerald-100 scale-[1.02]"
                    : `${colors.border} shadow-lg`
                } bg-white p-6 sm:p-8 flex flex-col transition-all duration-300`}
              >
                {isPopular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-bold text-white shadow-lg">
                    {t("Most popular")}
                  </span>
                )}

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${colors.bg} mb-5`}
                >
                  <span className="text-2xl">{tier.icon}</span>
                </div>

                <h3 className={`text-2xl font-bold ${colors.text}`}>
                  {tier.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {t(TIER_DESCRIPTIONS[tierKey])}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-gray-700"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <hr className="my-6 border-gray-200" />

                {/* All billing options */}
                <div className="space-y-2 mb-4">
                  {billing.oneTime && (
                    <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-2 transition-colors ${
                      billingMode === "oneTime" ? "bg-blue-50 ring-1 ring-blue-300" : "bg-gray-50"
                    }`}>
                      <span className="text-gray-600 font-medium">{t("One-time payment")}</span>
                      <span className="font-bold text-gray-900">
                        {isNok ? formatPrice(billing.oneTime.priceNok) : formatPriceUsd(billing.oneTime.priceNok)}
                        <span className="text-xs text-gray-400 font-normal ml-1">{t("excl. VAT")}</span>
                      </span>
                    </div>
                  )}
                  <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-2 transition-colors ${
                    billingMode === "monthly" ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-gray-50"
                  }`}>
                    <span className="text-gray-600 font-medium">{t("Monthly")}</span>
                    <span className="font-bold text-gray-900">
                      {isNok ? formatPrice(billing.monthly.priceNok) : formatPriceUsd(billing.monthly.priceNok)}
                      <span className="text-gray-500 font-medium">{t("/mo")}</span>
                      <span className="text-xs text-gray-400 font-normal ml-1">{t("excl. VAT")}</span>
                    </span>
                  </div>
                  {billing.annual && (
                    <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-2 transition-colors ${
                      billingMode === "annual" ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-gray-50"
                    }`}>
                      <span className="text-gray-600 font-medium">
                        {t("Yearly")} <span className="text-xs text-emerald-600 font-bold ml-1">{t("Save 15%")}</span>
                      </span>
                      <span className="font-bold text-emerald-700">
                        {isNok ? formatPrice(billing.annual.priceNok) : formatPriceUsd(billing.annual.priceNok)}
                        <span className="text-emerald-600 font-medium">{t("/yr")}</span>
                        <span className="text-xs text-emerald-500 font-normal ml-1">{t("excl. VAT")}</span>
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {active.consultantLabel}
                </p>
                <a
                  href={active.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full rounded-lg ${colors.btn} px-4 py-3 text-center text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95`}
                >
                  {t("pricing.subscribeTo", { name: tier.name })} — {active.label}
                </a>

                <p className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {t("Secure payment via Stripe")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Consultant info */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-gray-800 to-gray-700 p-8 sm:p-10 text-white">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl"></span>
              <h3 className="text-xl font-bold">{t("Personal consultant included")}</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 text-left">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <p className="text-sm font-semibold text-emerald-300 mb-1">
                   {t("Monthly / Yearly subscription")}
                </p>
                <p className="text-sm text-gray-300">
                  {t("A dedicated consultant follows you from start to finish. You get guidance throughout the entire process — from design to finished product.")}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <p className="text-sm font-semibold text-amber-300 mb-1">
                   {t("One-time payment")}
                </p>
                <p className="text-sm text-gray-300">
                  {t("You get full access to the product immediately. Once you submit your order, we connect you with a consultant to help you further.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 text-center">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 p-8 sm:p-10 text-white shadow-xl">
          <h2 className="text-2xl font-bold">{t("Have questions?")}</h2>
          <p className="mt-2 text-emerald-100 max-w-lg mx-auto">
            {t("Ask Hilde — our assistant at the bottom right of the page. She can answer anything about Kitoslight, Zongosol, and Kitozon.")}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/zongosol"
              className="rounded-xl bg-white px-8 py-3 text-base font-semibold text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-lg"
            >
              {t("Try Zongosol")}
            </Link>
            <Link
              to="/kitoslight"
              className="rounded-xl border-2 border-white/30 bg-transparent px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200"
            >
              {t("Explore Kitoslight")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
