import { Link } from "@tanstack/react-router";

const PLANS = [
  { name: "Kitoslight", price: "$29", desc: "Environmental monitoring" },
  { name: "Zongosol", price: "$49", desc: "Container home design" },
  { name: "Dashboard", price: "$99", desc: "Full admin control", highlight: true },
];

export function UpgradePrompt({ tier, userName }: { tier: string; userName: string }) {
  return (
    <main className="flex-1 bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100">
          <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Dashboard Access Required</h1>
        <p className="text-gray-600 mb-2">
          Hi <span className="font-semibold text-emerald-600">{userName}</span>, your current tier is{" "}
          <span className="font-semibold capitalize">{tier === "none" ? "Free" : tier}</span>.
        </p>
        <p className="text-gray-500 mb-8 text-sm max-w-md mx-auto">
          The admin dashboard — device management, ESG reports, IP integration, and user administration — requires a{" "}
          <span className="font-semibold text-gray-700">Dashboard</span> subscription ($99/mo).
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {PLANS.map((plan) => {
            const isCurrent = tier === plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                className={`rounded-xl border-2 p-5 text-left ${plan.highlight ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"}`}
              >
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                {isCurrent && <span className="mt-2 inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">Current</span>}
              </div>
            );
          })}
        </div>

        <Link to="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
