import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoSvg from "~/assets/flexora-logo.svg";
import iconSvg from "~/assets/flexora-icon.svg";
import { getFeaturedPTs, type FeaturedPT } from "~/lib/pt-ratings-actions";
import { STRIPE_PAYMENT_LINKS, FREE_TRIAL_MESSAGE } from "~/lib/stripe";

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

const clientTiers = [
  {
    name: "Basis",
    price: "149 kr/mnd",
    color: "bg-white border-gray-200",
    highlight: false,
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
    name: "Hybrid",
    price: "249 kr/mnd",
    color: "bg-blue-50 border-blue-300",
    highlight: true,
    features: [
      "Everything in Basis",
      "AI-PT coaching",
      "Create groups",
      "Arrange competitions",
    ],
  },
  {
    name: "Premium",
    price: "399 kr/mnd",
    color: "bg-white border-gray-200",
    highlight: false,
    features: [
      "Everything in Hybrid",
      "Live video training",
      "Movement correction",
      "Breathing measurement",
      "1-on-1 PT sessions",
    ],
  },
];

function Home() {
  return (
    <div className="min-h-dvh bg-white text-gray-900">
      {/* --- Nav --- */}
      <Nav />

      {/* --- Hero --- */}
      <Hero />

      {/* --- What is Flexora --- */}
      <WhatIsFlexora />

      {/* --- For Clients --- */}
      <ForClients />

      {/* --- For PTs --- */}
      <ForPTs />

      {/* --- Subscription Tiers --- */}
      <ClientTiers />

      {/* --- PT Subscription --- */}
      <PTSubscription />

      {/* --- CTA --- */}
      <CTA />

      {/* --- Featured Trainers --- */}
      <FeaturedTrainers />

      {/* --- Footer --- */}
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <img src={iconSvg} alt="Flexora" className="h-9 w-9" />
          <span className="text-xl font-bold text-[#1A56DB]">Flexora</span>
        </a>
        <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#what" className="hover:text-[#1A56DB] transition-colors">What is Flexora</a>
          <a href="#clients" className="hover:text-[#1A56DB] transition-colors">For Clients</a>
          <a href="#pts" className="hover:text-[#1A56DB] transition-colors">For PTs</a>
          <a href="#pricing" className="hover:text-[#1A56DB] transition-colors">Pricing</a>
          <a
            href="/register"
            className="rounded-full bg-[#1A56DB] px-5 py-2 text-white hover:bg-[#1E40AF] transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
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
            The World's First Two-Sided PT Marketplace
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-blue-100 md:text-xl">
            AI-powered fitness meets global personal training. Train smarter with
            3D muscle visualization, live form correction, voice coaching, and
            book verified PTs anywhere in the world.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="/register"
              className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#1A56DB] shadow-lg hover:bg-blue-50 transition-colors"
              >
              Start Training Free
            </a>
            <a
              href="#pricing"
              className="rounded-full border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              View Plans
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
  return (
    <section id="what" className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="What is Flexora Fitnes?"
          subtitle="A complete fitness ecosystem for clients and trainers alike."
        />
        <div className="grid gap-8 md:grid-cols-2">
          {/* For Clients card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A56DB]/10">
              <svg className="h-7 w-7 text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">For Clients</h3>
            <p className="text-gray-600 leading-relaxed">
              Your complete training journey — from warmup to workout to stretching
              and nutrition — all in one place. Get AI-powered coaching with 3D
              muscle maps, live form correction, voice guidance, and breathing
              analysis. Scan your meals, compete globally, and book the perfect PT
              anywhere in the world.
            </p>
          </div>
          {/* For PTs card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6]/10">
              <svg className="h-7 w-7 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">For Personal Trainers</h3>
            <p className="text-gray-600 leading-relaxed">
              Register, showcase your diploma and experience, and market yourself
              to a global client base. Use our innovative speed-date matching to
              connect with ideal clients. Only verified, certified professionals
              join Flexora — protecting your reputation and client trust.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForClients() {
  return (
    <section id="clients" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="Complete Training Journey"
          subtitle="Everything you need to reach your goals, powered by AI."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clientFeatures.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#3B82F6]/30 transition-all"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A56DB]/10 group-hover:bg-[#1A56DB]/20 transition-colors">
                <div className="h-2 w-2 rounded-full bg-[#1A56DB]" />
              </div>
              <h4 className="mb-2 font-semibold text-gray-900">{f.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForPTs() {
  return (
    <section id="pts" className="bg-[#1A56DB]/5 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="Trainers, Go Global"
          subtitle="Join the world's premier PT marketplace. Verified. Professional. Borderless."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {ptFeatures.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/10">
                <svg className="h-5 w-5 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-gray-900">{f.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClientTiers() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="Client Subscription Plans"
          subtitle="Choose the tier that fits your fitness journey. All plans include a 1-month free trial."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {clientTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border-2 p-8 shadow-sm transition-all hover:shadow-lg ${
                tier.highlight
                  ? "border-[#3B82F6] bg-blue-50 ring-1 ring-[#3B82F6] scale-[1.02]"
                  : "border-gray-100 bg-white"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1A56DB] px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="mb-1 text-xl font-bold text-gray-900">{tier.name}</h3>
              <p className="mb-6 text-3xl font-extrabold text-[#1A56DB]">{tier.price}</p>
              <ul className="mb-8 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={STRIPE_PAYMENT_LINKS[tier.name.toLowerCase()] || "#pricing"}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? "bg-[#1A56DB] text-white hover:bg-[#1E40AF]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Start {tier.name} — Free Trial
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PTSubscription() {
  return (
    <section className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-lg rounded-2xl border-2 border-[#3B82F6] bg-white p-8 text-center shadow-lg ring-1 ring-[#3B82F6]/20">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#3B82F6]/10">
            <svg className="h-8 w-8 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">PT Subscription</h3>
          <p className="mb-4 text-3xl font-extrabold text-[#1A56DB]">199 kr/mnd</p>
          <p className="mb-6 text-gray-500">Everything you need to grow your training business globally.</p>
          <ul className="mb-8 space-y-3 text-left">
            {[
              "Professional verified profile",
              "Global marketing & visibility",
              "Speed date matching with clients",
              "Full access to global client base",
              "Booking & scheduling tools",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={STRIPE_PAYMENT_LINKS.pt}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-full bg-[#1A56DB] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
          >
            Register as a PT — Free Trial
          </a>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] py-20 text-white md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          Ready to Transform Your Fitness?
        </h2>
        <p className="mb-4 text-lg text-blue-100 md:text-xl">
          Join thousands of clients and verified PTs on the world's most advanced
          fitness platform. Start your journey today.
        </p>
        <p className="mb-10 text-base font-medium text-white/90">
          {FREE_TRIAL_MESSAGE}
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#1A56DB] shadow-lg hover:bg-blue-50 transition-colors"
          >
            Sign Up as Client
          </a>
          <a
            href="/register"
            className="rounded-full border-2 border-white/50 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Register as PT
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <img src={iconSvg} alt="Flexora" className="h-6 w-6" />
            <span className="text-sm font-semibold text-gray-500">Flexora Fitnes</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Flexora Fitnes. All rights reserved.
          </p>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-[#1A56DB]">
          {FREE_TRIAL_MESSAGE}
        </p>
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
          title="Våre PT-er"
          subtitle="Meet our top-rated verified personal trainers from around the world."
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
                    {pt.country || "Worldwide"}
                  </p>
                  <p className="mb-2 text-xs text-gray-400">
                    {pt.yearsOfExperience}{" "}
                    {pt.yearsOfExperience === 1 ? "year" : "years"} experience
                  </p>
                  <div className="flex justify-center">
                    <StarRating pct={pt.ratingPct} />
                  </div>
                  {pt.totalRatings > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      ({pt.totalRatings} {pt.totalRatings === 1 ? "rating" : "ratings"})
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
                    {pt.yearsOfExperience} years experience
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
