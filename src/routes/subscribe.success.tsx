import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/subscription";
import { useAuth } from "~/lib/auth.tsx";
import { useEffect, useState } from "react";
import { upgradeSubscription } from "~/lib/subscription";

export const Route = createFileRoute("/subscribe/success")({
  component: SubscribeSuccess,
  validateSearch: (search: Record<string, unknown>) => ({
    tier: (search.tier as string) || "",
  }),
});

function SubscribeSuccess() {
  const { tier } = useSearch({ from: "/subscribe/success" });
  const { user } = useAuth();
  const [upgraded, setUpgraded] = useState(false);
  const [error, setError] = useState("");

  const tierInfo =
    tier && SUBSCRIPTION_TIERS[tier as TierKey]
      ? SUBSCRIPTION_TIERS[tier as TierKey]
      : null;

  useEffect(() => {
    if (user && tier && SUBSCRIPTION_TIERS[tier as TierKey]) {
      upgradeSubscription({
        data: { userId: user.id, tier: tier as TierKey },
      })
        .then((result) => {
          if (result.ok) {
            setUpgraded(true);
          } else {
            setError(result.error || "Failed to update subscription");
          }
        })
        .catch((err) => {
          setError(err.message || "An error occurred");
        });
    }
  }, [user, tier]);

  const getDashboardLink = () => {
    if (tierInfo?.name === "Dashboard") return "/dashboard";
    if (tierInfo?.name === "Zongosol") return "/zongosol";
    if (tierInfo?.name === "Kitoslight") return "/kitoslight";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (tierInfo?.name === "Dashboard") return "Go to Dashboard";
    if (tierInfo?.name === "Zongosol") return "Go to Zongosol";
    if (tierInfo?.name === "Kitoslight") return "Go to Kitoslight";
    return "Go to Dashboard";
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-10 w-10 text-emerald-600"
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
        </div>

        <h1 className="mt-8 text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Thank you for subscribing!
        </h1>

        {tierInfo ? (
          <div className="mt-6">
            <p className="text-lg text-gray-600">
              You are now subscribed to the{" "}
              <span className={`font-bold text-${tierInfo.color}-600`}>
                {tierInfo.name}
              </span>{" "}
              plan ({tierInfo.price}).
            </p>
          </div>
        ) : (
          <p className="mt-6 text-lg text-gray-600">
            Your subscription has been activated successfully.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {upgraded && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
            Your account has been updated with your new subscription tier.
          </div>
        )}

        {!user && (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Please{" "}
            <Link to="/login" className="font-semibold underline">
              sign in
            </Link>{" "}
            to have your subscription linked to your account.
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to={getDashboardLink()}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all duration-200"
          >
            {getDashboardLabel()}
          </Link>
          <Link
            to="/account"
            className="w-full sm:w-auto rounded-xl border-2 border-emerald-200 bg-white px-8 py-4 text-base font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200"
          >
            View Account
          </Link>
        </div>
      </div>
    </main>
  );
}
