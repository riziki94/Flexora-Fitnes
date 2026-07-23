import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { formatPrice, formatPriceUsd } from "~/lib/currency";
import { SUBSCRIPTION_TIERS, type BillingOption } from "~/lib/subscription";
import { useLanguage } from "~/lib/i18n.tsx";

type BillingMode = "oneTime" | "monthly" | "annual";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "Kitozon";
  } catch {
    return "Kitozon";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const { t, currency } = useLanguage();
  const isNok = currency === "NOK";

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-200/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-28 lg:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {t("home.designYour")}{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                {t("home.sustainable")}
              </span>{" "}
              {t("home.containerHome")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
              {t("home.bringsTogether", { name: businessName })}
            </p>
            <p className="mt-3 text-sm text-gray-400 flex items-center justify-center gap-2">
              {t("home.norwegianGroup")}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/zongosol"
                className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-200"
              >
                {t("home.startDesigning")}
              </Link>
              <Link
                to="/kitoslight"
                className="w-full sm:w-auto rounded-xl border-2 border-emerald-200 bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200"
              >
                {t("home.exploreMonitoring")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("home.twoSolutions")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("home.everythingDesign")}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Zongosol Card */}
            <a
              href="https://www.zongosol.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 block"
            >
              <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 to-green-400" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-6">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Zongosol</h3>
              <p className="mt-2 text-sm font-medium text-emerald-600 uppercase tracking-wide">
                {t("home.containerHomeDesign")}
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t("home.zongosolDesc")}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  t("home.feature3dTool"),
                  t("home.featureCustomLayouts"),
                  t("home.featureSolarIntegration"),
                  t("home.featureDirectOrder"),
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md group-hover:bg-emerald-700 transition-colors">
                  {t("home.exploreZongosol")}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>

            {/* Kitoslight Card */}
            <a
              href="https://www.kitoslight.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-100 hover:border-blue-200 block"
            >
              <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-400" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-6">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Kitoslight</h3>
              <p className="mt-2 text-sm font-medium text-blue-600 uppercase tracking-wide">
                {t("home.envMonitoring")}
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t("home.kitoslightDesc")}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  t("home.featureRealtimeAir"),
                  t("home.featureSolarTracking"),
                  t("home.featureMapViz"),
                  t("home.featureEsgReports"),
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md group-hover:bg-blue-700 transition-colors">
                  {t("home.exploreKitoslight")}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("home.flexibleSubs")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("home.threeTiers")}
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setBillingMode("oneTime")}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  billingMode === "oneTime"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("home.oneTime")}
              </button>
              <button
                onClick={() => setBillingMode("monthly")}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  billingMode === "monthly"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("home.monthly")}
              </button>
              <button
                onClick={() => setBillingMode("annual")}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  billingMode === "annual"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("home.yearly")}
              </button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {(["kitoslight", "zongosol", "dashboard"] as const).map((tierKey) => {
              const tier = SUBSCRIPTION_TIERS[tierKey];
              const isPopular = tierKey === "zongosol";
              const colorClasses: Record<string, { bg: string; text: string; btn: string; border: string }> = {
                kitoslight: { bg: "bg-blue-100", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700", border: "border-blue-300" },
                zongosol: { bg: "bg-emerald-100", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700", border: "border-emerald-300" },
                dashboard: { bg: "bg-purple-100", text: "text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", border: "border-purple-300" },
              };
              const c = colorClasses[tierKey];

              const activeBilling: BillingOption | undefined =
                billingMode === "oneTime"
                  ? tier.billingOptions.oneTime
                  : billingMode === "annual"
                    ? tier.billingOptions.annual
                    : tier.billingOptions.monthly;
              const active = activeBilling ?? tier.billingOptions.monthly;

              return (
                <div
                  key={tierKey}
                  className={`relative rounded-2xl border ${
                    isPopular
                      ? `${c.border} ring-2 ring-emerald-500 bg-white p-8 shadow-lg shadow-emerald-100`
                      : "border-gray-200 bg-white p-8 shadow-sm"
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white">
                      {t("home.mostPopular")}
                    </span>
                  )}
                  <img src="/images/logo-original.png" alt="Kitozon" className="h-10 w-auto mb-4" />
                  <h3 className={`text-xl font-bold ${c.text}`}>{tier.name}</h3>

                  {/* All billing options visible */}
                  <div className="mt-4 space-y-2 border-b border-gray-100 pb-4">
                    {tier.billingOptions.oneTime && (
                      <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                        billingMode === "oneTime" ? "bg-emerald-50 ring-1 ring-emerald-300" : ""
                      }`}>
                        <span className="text-gray-600 font-medium">{t("home.oneTime")}</span>
                        <span className="font-bold text-gray-900">
                          {isNok ? formatPrice(tier.billingOptions.oneTime.priceNok) : formatPriceUsd(tier.billingOptions.oneTime.priceNok)}
                          <span className="text-xs text-gray-400 font-normal ml-1">{t("home.exclVat")}</span>
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                      billingMode === "monthly" ? "bg-emerald-50 ring-1 ring-emerald-300" : ""
                    }`}>
                      <span className="text-gray-600 font-medium">{t("home.monthly")}</span>
                      <span className="font-bold text-gray-900">
                        {isNok ? formatPrice(tier.billingOptions.monthly.priceNok) : formatPriceUsd(tier.billingOptions.monthly.priceNok)}
                        <span className="text-gray-500 font-medium">{t("home.perMonth")}</span>
                        <span className="text-xs text-gray-400 font-normal ml-1">{t("home.exclVat")}</span>
                      </span>
                    </div>
                    {tier.billingOptions.annual && (
                      <div className={`flex justify-between items-center text-sm rounded-lg px-3 py-1.5 transition-colors ${
                        billingMode === "annual" ? "bg-emerald-50 ring-1 ring-emerald-300" : ""
                      }`}>
                        <span className="text-gray-600 font-medium">{t("home.yearly")}</span>
                        <span className="font-bold text-emerald-700">
                          {isNok ? formatPrice(tier.billingOptions.annual.priceNok) : formatPriceUsd(tier.billingOptions.annual.priceNok)}
                          <span className="text-emerald-600 font-medium">{t("home.perYear")}</span>
                          <span className="text-xs text-emerald-500 font-normal ml-1">(-15%)</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Consultant note */}
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 mb-2">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t(active.consultantLabel)}
                  </p>

                  <ul className="mt-4 space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t(f)}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={active.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 block w-full rounded-xl ${c.btn} px-6 py-3 text-center text-sm font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg`}
                  >
                    {t("pricing.subscribeTo", { name: tier.name })}
                  </a>
                  <p className="mt-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t("home.securePayment")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-green-500 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("home.readyToBuild")}
          </h2>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
            {t("home.joinToday", { name: businessName })}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/zongosol"
              className="rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg hover:bg-emerald-50 transition-all duration-200"
            >
              {t("home.tryZongosol")}
            </Link>
            <Link
              to="/login"
              className="rounded-xl border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200"
            >
              {t("home.signInDashboard")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
