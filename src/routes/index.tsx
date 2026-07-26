import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoSvg from "~/assets/flexora-logo.svg";
import iconSvg from "~/assets/flexora-icon.svg";
import { getFeaturedPTs, type FeaturedPT } from "~/lib/pt-ratings-actions";
import { STRIPE_PAYMENT_LINKS } from "~/lib/stripe";
import { useTranslation } from "~/lib/i18n";
import { BASE_PRICES } from "~/lib/currency";
import { FlagSwitcher } from "~/components/FlagSwitcher";
import { translations, type Language } from "~/lib/translations";
import { trackEvent } from "~/lib/pageview-tracker";
import { ExitIntentPopup } from "~/components/ExitIntentPopup";
import { subscribeNewsletter } from "~/lib/newsletter-actions";

export const Route = createFileRoute("/")({
  component: Home,
});

// --- Data ---
const clientFeatures = [
  {
    title: "3D Muscle Visualization",
    desc: "See exactly which muscles you're activating in real time with our advanced 3D body map.",
  },
  {
    title: "Live Video + Form Correction",
    desc: "AI-powered movement analysis corrects your form live — like having a PT watching every rep.",
  },
  {
    title: "Voice Guidance",
    desc: "Hands-free coaching keeps you focused. Clear, motivating audio cues guide you through every set.",
  },
  {
    title: "Breathing Measurement",
    desc: "Track your breathing patterns to optimize endurance and recovery during workouts.",
  },
  {
    title: "Color-Coded Effort",
    desc: "Red, yellow, green — instantly see your intensity level and know when to push or pull back.",
  },
  {
    title: "Auto Timer",
    desc: "No more watching the clock. Rest periods, intervals, and circuits are timed automatically.",
  },
  {
    title: "Food Scanning",
    desc: "Snap a photo of your meal and get instant macro breakdowns. Nutrition made effortless.",
  },
  {
    title: "Music Integration",
    desc: "Connect your favorite music app. Train to the beat with tempo-matched playlists.",
  },
  {
    title: "Global Ranking & Competitions",
    desc: "Compete with users worldwide. Climb leaderboards, join challenges, and earn your spot.",
  },
  {
    title: "Book PT Sessions Worldwide",
    desc: "Find and book verified professional trainers anywhere in the world, right from the app.",
  },
];

const ptFeatures = [
  {
    title: "Professional Profile",
    desc: "Showcase your diploma, certifications, and experience. Stand out to potential clients.",
  },
  {
    title: "Global Marketing",
    desc: "Market yourself to a worldwide audience. Expand your client base beyond geographic limits.",
  },
  {
    title: "Speed Date Matching",
    desc: "Quick video introductions to match with ideal clients. Find the right fit fast.",
  },
  {
    title: "Verified Professionals Only",
    desc: "Every trainer is verified. Documentation checked. Only real, qualified PTs on Flexora.",
  },
];

// Tier feature keys — used for translating pricing card features
const tierFeatureKeys: Record<string, string[]> = {
  basis: [
    "tier.basis.1", "tier.basis.2", "tier.basis.3",
    "tier.basis.4", "tier.basis.5", "tier.basis.6",
  ],
  hybrid: [
    "tier.hybrid.1", "tier.hybrid.2", "tier.hybrid.3", "tier.hybrid.4",
  ],
  premium: [
    "tier.premium.1", "tier.premium.2", "tier.premium.3",
    "tier.premium.4", "tier.premium.5",
  ],
};

function Home() {
  useEffect(() => {
    trackEvent({ eventType: "pageview", path: "/" });
  }, []);

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      {/* --- Sticky launch banner --- */}
      <LaunchBanner />

      {/* --- Nav --- */}
      <Nav />

      {/* --- Hero --- */}
      <Hero />

      {/* --- What is Flexora --- */}
      <WhatIsFlexora />

      {/* --- For Clients --- */}
      <ForClients />

      {/* --- Inline CTA after Complete Training Journey --- */}
      <InlineCTA />

      {/* --- For PTs --- */}
      <ForPTs />

      {/* --- Inline CTA after Trainers Go Global --- */}
      <InlineCTA />

      {/* --- PT Recruitment (NEW) --- */}
      <PTRecruitment />

      {/* --- Subscription Tiers --- */}
      <ClientTiers />

      {/* --- Trust Signals (NEW) --- */}
      <TrustSignals />

      {/* --- PT Subscription --- */}
      <PTSubscription />

      {/* --- CTA --- */}
      <CTA />

      {/* --- Featured Trainers --- */}
      <FeaturedTrainers />

      {/* --- Share Flexora --- */}
      <ShareSection />

      {/* --- Footer --- */}
      <Footer />

      {/* --- Exit Intent Popup --- */}
      <ExitIntentPopup />
    </div>
  );
}

// ─── Launch Banner ──────────────────────────────────────────────
function LaunchBanner() {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-[60] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-gray-900 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2.5 text-center">
        <p className="text-sm font-bold leading-snug sm:text-base">
          {t("banner.launchText")}
        </p>
        <a
          href="/register"
          className="ml-4 hidden shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-orange-700 shadow hover:bg-orange-50 transition-colors sm:inline-block"
        >
          {t("banner.startFree")}
        </a>
      </div>
    </div>
  );
}

// ─── Inline CTA ──────────────────────────────────────────────────
function InlineCTA() {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <a
          href="/register"
          className="inline-block rounded-full bg-[#1A56DB] px-10 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E40AF] transition-colors min-h-[44px] flex items-center justify-center sm:inline-flex"
        >
          {t("inline.cta.startFree")}
        </a>
      </div>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────
function Nav() {
  const { t } = useTranslation();
  return (
    <nav className="sticky top-[41px] z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <img src={iconSvg} alt="Flexora" className="h-9 w-9" />
          <span className="text-xl font-bold text-[#1A56DB]">Flexora</span>
        </a>
        <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#what" className="hover:text-[#1A56DB] transition-colors">{t("nav.whatIsFlexora")}</a>
          <a href="#clients" className="hover:text-[#1A56DB] transition-colors">{t("nav.forClients")}</a>
          <a href="#pts" className="hover:text-[#1A56DB] transition-colors">{t("nav.forPTs")}</a>
          <a href="#pricing" className="hover:text-[#1A56DB] transition-colors">{t("nav.pricing")}</a>
          <FlagSwitcher />
          <a
            href="/register"
            className="rounded-full bg-[#1A56DB] px-5 py-2 text-white hover:bg-[#1E40AF] transition-colors"
          >
            {t("nav.getStarted")}
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────
function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1A56DB] via-[#3B82F6] to-[#1E40AF] text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <img
            src={logoSvg}
            alt="Flexora Fitnes"
            className="mb-8 h-auto w-72 max-w-full drop-shadow-lg md:w-96"
          />
          {/* Tagline */}
          <h1 className="mb-4 max-w-3xl text-2xl font-bold leading-tight md:text-4xl lg:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-blue-100 md:text-xl">
            {t("hero.subtitle")}
          </p>
          {/* NEW: Join tagline */}
          <p className="mb-8 max-w-2xl text-base font-medium text-blue-200 md:text-lg">
            {t("hero.joinTagline")}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="/register"
              className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#1A56DB] shadow-lg hover:bg-blue-50 transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t("hero.startFree")}
            </a>
            <a
              href="#pricing"
              className="rounded-full border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t("hero.viewPlans")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">{title}</h2>
      {subtitle && <p className="text-lg text-gray-500">{subtitle}</p>}
    </div>
  );
}

function WhatIsFlexora() {
  const { t } = useTranslation();
  return (
    <section id="what" className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={t("section.whatIsFlexora")}
          subtitle={t("section.whatSubtitle")}
        />
        <div className="grid gap-8 md:grid-cols-2">
          {/* For Clients card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A56DB]/10">
              <svg className="h-7 w-7 text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">{t("section.forClients")}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t("section.forClientsDesc")}
            </p>
          </div>
          {/* For PTs card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6]/10">
              <svg className="h-7 w-7 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">{t("section.forPTs")}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t("section.forPTsDesc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForClients() {
  const { t } = useTranslation();
  const clientFeatureKeys = [
    { tKey: "feature.3dMuscle", dKey: "feature.3dMuscleDesc" },
    { tKey: "feature.liveVideo", dKey: "feature.liveVideoDesc" },
    { tKey: "feature.voice", dKey: "feature.voiceDesc" },
    { tKey: "feature.breathing", dKey: "feature.breathingDesc" },
    { tKey: "feature.effort", dKey: "feature.effortDesc" },
    { tKey: "feature.timer", dKey: "feature.timerDesc" },
    { tKey: "feature.food", dKey: "feature.foodDesc" },
    { tKey: "feature.music", dKey: "feature.musicDesc" },
    { tKey: "feature.ranking", dKey: "feature.rankingDesc" },
    { tKey: "feature.bookPT", dKey: "feature.bookPTDesc" },
  ];
  return (
    <section id="clients" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={t("section.completeJourney")}
          subtitle={t("section.journeySubtitle")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clientFeatureKeys.map((f) => (
            <div
              key={f.tKey}
              className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#3B82F6]/30 transition-all"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A56DB]/10 group-hover:bg-[#1A56DB]/20 transition-colors">
                <div className="h-2 w-2 rounded-full bg-[#1A56DB]" />
              </div>
              <h4 className="mb-2 font-semibold text-gray-900">{t(f.tKey)}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{t(f.dKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForPTs() {
  const { t } = useTranslation();
  const ptFeatureKeys = [
    { tKey: "pt.profile", dKey: "pt.profileDesc" },
    { tKey: "pt.marketing", dKey: "pt.marketingDesc" },
    { tKey: "pt.speedDate", dKey: "pt.speedDateDesc" },
    { tKey: "pt.verified", dKey: "pt.verifiedDesc" },
  ];
  return (
    <section id="pts" className="bg-[#1A56DB]/5 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={t("section.trainersGlobal")}
          subtitle={t("section.trainersSubtitle")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {ptFeatureKeys.map((f) => (
            <div
              key={f.tKey}
              className="flex gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/10">
                <svg className="h-5 w-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-gray-900">{t(f.tKey)}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{t(f.dKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PT Recruitment Section (NEW — before pricing) ──────────────
function PTRecruitment() {
  const { t } = useTranslation();
  return (
    <section className="bg-gradient-to-r from-[#1A56DB]/5 to-[#3B82F6]/5 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#1A56DB]/10">
          <svg className="h-8 w-8 text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
          {t("ptRecruit.title")}
        </h2>
        <p className="mb-8 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
          {t("ptRecruit.description")}
        </p>
        <a
          href="/register"
          className="inline-flex items-center justify-center rounded-full bg-[#1A56DB] px-10 py-4 text-base font-semibold text-white shadow-lg hover:bg-[#1E40AF] transition-colors min-h-[44px]"
        >
          {t("ptRecruit.cta")}
        </a>
      </div>
    </section>
  );
}

// ─── Client Tiers (modified: launch discount, Basis prominence) ──
function ClientTiers() {
  const { t, formatPrice, formatPriceWithPeriod, getStripeLink: getLink } = useTranslation();
  const periodSuffix = t("pricing.perMonth");
  const tiers = [
    { name: t("pricing.basis"), price: formatPriceWithPeriod(BASE_PRICES.basis, periodSuffix), key: "basis", color: "bg-white border-gray-200", highlight: false, entry: true },
    { name: t("pricing.hybrid"), price: formatPriceWithPeriod(BASE_PRICES.hybrid, periodSuffix), key: "hybrid", color: "bg-blue-50 border-blue-300", highlight: true, entry: false },
    { name: t("pricing.premium"), price: formatPriceWithPeriod(BASE_PRICES.premium, periodSuffix), key: "premium", color: "bg-white border-gray-200", highlight: false, entry: false },
  ];
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={t("section.clientPlans")}
          subtitle={t("section.clientPlansSubtitle")}
        />
        {/* Launch discount banner */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-2 text-sm font-bold text-gray-900 shadow-md">
            {t("pricing.launchDiscount")}
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-2xl border-2 p-8 shadow-sm transition-all hover:shadow-lg ${
                tier.highlight
                  ? "border-[#3B82F6] bg-blue-50 ring-1 ring-[#3B82F6] scale-[1.02]"
                  : tier.entry
                  ? "border-[#22C55E] bg-green-50/50 ring-1 ring-[#22C55E]/30"
                  : "border-gray-100 bg-white"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1A56DB] px-4 py-1 text-xs font-semibold text-white">
                  {t("pricing.mostPopular")}
                </span>
              )}
              {tier.entry && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#22C55E] px-4 py-1 text-xs font-semibold text-white">
                  {t("pricing.bestStart")}
                </span>
              )}
              <h3 className="mb-1 text-xl font-bold text-gray-900">{tier.name}</h3>
              <p className="mb-6 text-3xl font-extrabold text-[#1A56DB]">{tier.price}</p>
              <ul className="mb-8 space-y-3">
                {(tierFeatureKeys[tier.key] || []).map((featureKey: string) => (
                  <li key={featureKey} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t(featureKey as any)}
                  </li>
                ))}
              </ul>
              <a
                href={getLink(tier.key)}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors min-h-[44px] flex items-center justify-center ${
                  tier.highlight
                    ? "bg-[#1A56DB] text-white hover:bg-[#1E40AF]"
                    : tier.entry
                    ? "bg-[#22C55E] text-white hover:bg-[#16A34A]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t("pricing.startTrial", { plan: tier.name })}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust Signals Section (NEW — after pricing) ─────────────────
function TrustSignals() {
  const { t } = useTranslation();
  const signals = [
    {
      icon: (
        <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: t("trust.verifiedPTs"),
    },
    {
      icon: (
        <svg className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      text: t("trust.securePayments"),
    },
    {
      icon: (
        <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      text: t("trust.satisfactionGuarantee"),
    },
  ];
  return (
    <section className="border-y border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {signals.map((signal, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-2 rounded-xl bg-gray-50 p-6"
            >
              {signal.icon}
              <p className="text-sm font-medium text-gray-700 leading-relaxed">{signal.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PTSubscription() {
  const { t, lang, formatPrice, getStripeLink: getLink } = useTranslation();
  const langTranslations = translations[lang] as unknown as Record<string, string | readonly string[]>;
  const ptFeatures = (langTranslations["pricing.ptFeatures"] || translations.en["pricing.ptFeatures"]) as readonly string[];
  const ptPrice = t("pricing.ptPrice", { price: formatPrice(BASE_PRICES.pt) });
  return (
    <section className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-lg rounded-2xl border-2 border-[#3B82F6] bg-white p-8 text-center shadow-lg ring-1 ring-[#3B82F6]/20">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#3B82F6]/10">
            <svg className="h-8 w-8 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">{t("pricing.ptPlan")}</h3>
          <p className="mb-4 text-3xl font-extrabold text-[#1A56DB]">{ptPrice}</p>
          <p className="mb-6 text-gray-500">{t("section.ptSubDesc")}</p>
          <ul className="mb-8 space-y-3 text-left">
            {ptFeatures.map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={getLink("pt")}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-full bg-[#1A56DB] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors min-h-[44px] flex items-center justify-center"
          >
            {t("pricing.startTrial", { plan: t("pricing.ptPlan") })}
          </a>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useTranslation();
  return (
    <section id="cta" className="bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] py-20 text-white md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          {t("cta.title")}
        </h2>
        <p className="mb-4 text-lg text-blue-100 md:text-xl">
          {t("cta.subtitle")}
        </p>
        <p className="mb-10 text-base font-medium text-white/90">
          {t("cta.freeTrialMessage")}
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#1A56DB] shadow-lg hover:bg-blue-50 transition-colors min-h-[44px] flex items-center justify-center"
          >
            {t("cta.signUpClient")}
          </a>
          <a
            href="/register"
            className="rounded-full border-2 border-white/50 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center"
          >
            {t("cta.registerPT")}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Share Section ────────────────────────────────────────────────
function ShareSection() {
  const { t } = useTranslation();
  const shareUrl = encodeURIComponent("https://4b6e74dd2d7c803e38bdf306792a9d33.ctonew.app");
  const shareText = encodeURIComponent("Check out Flexora Fitnes — AI-powered personal training with 3D muscle maps, live form correction, and global PT bookings. Free trial available!");

  const shareLinks = [
    {
      name: "Twitter / X",
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      color: "bg-black hover:bg-gray-800",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      ),
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: "bg-[#1877F2] hover:bg-[#166FE5]",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      ),
    },
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "bg-[#0A66C2] hover:bg-[#0959A8]",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      ),
    },
    {
      name: "Copy Link",
      url: "",
      color: "bg-gray-600 hover:bg-gray-700",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      ),
    },
  ];

  function handleCopyLink() {
    navigator.clipboard.writeText("https://4b6e74dd2d7c803e38bdf306792a9d33.ctonew.app").then(() => {
      const btn = document.getElementById("share-copy-btn");
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = t("share.copied");
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    }).catch(() => {});
  }

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">{t("share.title")}</h2>
        <p className="mb-8 text-gray-500">
          {t("share.description")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {shareLinks.map((link) => (
            link.url ? (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors ${link.color}`}
              >
                {link.icon}
                {link.name}
              </a>
            ) : (
            <button
              key={link.name}
              id="share-copy-btn"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors ${link.color}`}
            >
              {link.icon}
              {t("share.copyLink")}
            </button>
            )
          ))}
        </div>
        <p className="mt-6 text-sm text-gray-400">
          {t("share.referralHint")}
        </p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const result = await subscribeNewsletter({ email: email.trim() });
      if (result.ok) {
        setStatus("success");
        setMessage(t("newsletter.success"));
        setEmail("");
      } else {
        setStatus("error");
        setMessage(result.error || t("newsletter.error"));
      }
    } catch {
      setStatus("error");
      setMessage(t("newsletter.error"));
    }
  }

  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        {/* Newsletter signup */}
        <div className="mb-8 flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:flex-row md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{t("newsletter.title")}</p>
            <p className="text-xs text-gray-500">{t("newsletter.desc")}</p>
          </div>
          {status === "success" ? (
            <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t("newsletter.success")}
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full gap-2 md:w-auto">
              <label htmlFor="newsletter-email" className="sr-only">{t("newsletter.emailLabel")}</label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder={t("newsletter.placeholder")}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB] md:w-56"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="shrink-0 rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {status === "loading" ? "..." : t("newsletter.button")}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="text-xs text-red-500 md:hidden">{message}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <img src={iconSvg} alt="Flexora" className="h-6 w-6" />
            <span className="text-sm font-semibold text-gray-500">Flexora Fitnes</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/blog" className="text-sm text-gray-500 hover:text-[#1A56DB] transition-colors">
              Blog
            </a>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} {t("footer.rights")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <FlagSwitcher />
          <p className="text-sm font-medium text-[#1A56DB]">
            {t("cta.freeTrialMessage")}
          </p>
        </div>
      </div>
    </footer>
  );
}

// --- Placeholder PTs for fallback ---
const placeholderPTs = [
  { name: "Maria Jensen", country: "Norway", yearsOfExperience: 8, ratingPct: 96 },
  { name: "John Smith", country: "United Kingdom", yearsOfExperience: 12, ratingPct: 92 },
  { name: "Elena Rossi", country: "Italy", yearsOfExperience: 5, ratingPct: 88 },
  { name: "Carlos Mendez", country: "Spain", yearsOfExperience: 10, ratingPct: 94 },
];

// --- SVG Avatar Placeholder ---
function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#1A56DB] to-[#3B82F6] text-xl font-bold text-white shadow-inner">
      {initials}
    </div>
  );
}

// --- Star Rating Helper ---
function StarRating({ pct }: { pct: number }) {
  const stars = Math.round(pct / 20); // 0-5 stars
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i <= stars ? "text-amber-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-600">{pct}%</span>
    </div>
  );
}

function FeaturedTrainers() {
  const { t } = useTranslation();
  const [trainers, setTrainers] = useState<FeaturedPT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedPTs()
      .then((data) => setTrainers(data))
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false));
  }, []);

  const displayTrainers: FeaturedPT[] = trainers.length > 0 ? trainers : [];

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={t("section.featuredTrainers")}
          subtitle={t("section.featuredSubtitle")}
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-gray-200" />
                </div>
                <div className="space-y-3 text-center">
                  <div className="mx-auto h-5 w-32 rounded bg-gray-200" />
                  <div className="mx-auto h-4 w-24 rounded bg-gray-100" />
                  <div className="mx-auto h-4 w-20 rounded bg-gray-100" />
                  <div className="mx-auto h-4 w-28 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : displayTrainers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayTrainers.slice(0, 6).map((pt) => (
              <a
                key={pt.id}
                href={`/app/pt/${pt.id}`}
                className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#3B82F6]/40 hover:-translate-y-1"
              >
                <div className="mb-4 flex justify-center">
                  {pt.profilePicture ? (
                    <img
                      src={pt.profilePicture}
                      alt={pt.name}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-[#1A56DB]/20"
                    />
                  ) : (
                    <AvatarPlaceholder name={pt.name} />
                  )}
                </div>
                <div className="text-center">
                  <h4 className="mb-1 font-semibold text-gray-900 group-hover:text-[#1A56DB] transition-colors">
                    {pt.name}
                  </h4>
                  <p className="mb-2 text-sm text-gray-500">
                    {pt.country || t("trainers.worldwide")}
                  </p>
                  <p className="mb-2 text-xs text-gray-400">
                    {pt.yearsOfExperience}{" "}
                    {pt.yearsOfExperience === 1 ? t("trainers.yearLabel_one") : t("trainers.yearLabel_other")} experience
                  </p>
                  <div className="flex justify-center">
                    <StarRating pct={pt.ratingPct} />
                  </div>
                  {pt.totalRatings > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      ({pt.totalRatings} {pt.totalRatings === 1 ? t("trainers.ratingLabel_one") : t("trainers.ratingLabel_other")})
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          /* Fallback: 4 placeholder cards using static data */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {placeholderPTs.map((pt, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex justify-center">
                  <AvatarPlaceholder name={pt.name} />
                </div>
                <div className="text-center">
                  <h4 className="mb-1 font-semibold text-gray-900">{pt.name}</h4>
                  <p className="mb-2 text-sm text-gray-500">{pt.country}</p>
                  <p className="mb-2 text-xs text-gray-400">
                    {pt.yearsOfExperience} {t("trainers.experience")}
                  </p>
                  <div className="flex justify-center">
                    <StarRating pct={pt.ratingPct} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
