import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  getWorkoutPackages,
  purchasePackage,
  getUserPackagePurchases,
  getPackagePurchaseStatus,
} from "~/lib/package-actions";
import { PACKAGE_PRICE_LABEL, PACKAGE_ACCESS_HOURS } from "~/lib/stripe";

export const Route = createFileRoute("/app/store")({
  component: StorePage,
});

const GOAL_ICONS: Record<string, string> = {
  muscle_gain: "💪",
  weight_loss: "⚖️",
  cardio: "🏃",
  strength: "🏋️",
  general: "🎯",
};

const CATEGORY_COLORS: Record<string, string> = {
  muscle: "from-blue-500 to-indigo-600",
  weight_loss: "from-orange-500 to-red-500",
  strength: "from-red-600 to-rose-700",
  general: "from-green-500 to-emerald-600",
};

function StorePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/store" }) as any;
  const [packages, setPackages] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoPlanId, setDemoPlanId] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    loadData();
  }, []);

  // Handle payment return
  useEffect(() => {
    if (search?.payment === "success" && search?.packageId) {
      handlePaymentSuccess(Number(search.packageId));
    }
  }, [search]);

  async function loadData() {
    try {
      setLoading(true);
      const [pkgs, purs] = await Promise.all([
        getWorkoutPackages(),
        getUserPackagePurchases(),
      ]);
      setPackages(pkgs);
      setPurchases(purs.filter((p: any) => p.status === "active"));
    } catch (e: any) {
      if (e.message?.includes("Unauthorized")) {
        navigate({ to: "/login" });
      } else {
        setError(e.message || "Failed to load store");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSuccess(packageId: number) {
    try {
      setPurchasing(packageId);
      const result = await purchasePackage({ packageId });
      setDemoPlanId(result.planId);
      setShowDemoModal(true);
      loadData(); // refresh purchases
    } catch (e: any) {
      setError(e.message || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  }

  async function handleBuy(pkgId: number) {
    // In production, this opens Stripe checkout
    // For demo, simulate purchase directly
    try {
      setPurchasing(pkgId);
      const result = await purchasePackage({ packageId: pkgId });
      setDemoPlanId(result.planId);
      setShowDemoModal(true);
      loadData();
    } catch (e: any) {
      setError(e.message || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    navigate({ to: "/" });
  }

  function getTimeRemaining(expiresAt: string) {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

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
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/workout/plans" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Plans</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Treningspakker</h1>
          <p className="mt-1 text-gray-500">
            Ferdige treningsprogrammer — kjøp og få 24 timers tilgang for kun {PACKAGE_PRICE_LABEL}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Active Purchases */}
        {purchases.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Dine aktive pakker</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {purchases.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-xl border-2 border-green-200 bg-green-50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{GOAL_ICONS[p.package_goal] || "🎯"}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.package_name}</h3>
                        <p className="text-sm text-green-700">
                          Gjenstående: <span className="font-bold">{getTimeRemaining(p.expires_at)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate({ to: `/app/workout/plans/${p.plan_id}` })}
                      className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      Åpne plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Package Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {packages.map((pkg) => {
                const alreadyPurchased = purchases.some(
                  (p: any) => p.package_id === pkg.id
                );
                return (
                  <div
                    key={pkg.id}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-lg hover:-translate-y-1"
                  >
                    {/* Gradient header */}
                    <div
                      className={`bg-gradient-to-r ${CATEGORY_COLORS[pkg.category] || "from-blue-500 to-indigo-600"} p-5 text-white`}
                    >
                      <div className="mb-2 text-3xl">{GOAL_ICONS[pkg.goal] || "🎯"}</div>
                      <h3 className="text-lg font-bold">{pkg.name}</h3>
                      <p className="mt-1 text-sm opacity-90">
                        {pkg.days_per_week} dager/uke · {pkg.exercise_count} øvelser
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <p className="flex-1 text-sm text-gray-600 leading-relaxed">
                        {pkg.description}
                      </p>

                      {/* Price & CTA */}
                      <div className="mt-5 border-t pt-4">
                        <div className="mb-3 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-gray-900">
                            {PACKAGE_PRICE_LABEL}
                          </span>
                          <span className="text-xs text-gray-400">
                            / 24 timer
                          </span>
                        </div>
                        {alreadyPurchased ? (
                          <button
                            onClick={() => {
                              const purchase = purchases.find(
                                (p: any) => p.package_id === pkg.id
                              );
                              if (purchase) {
                                navigate({ to: `/app/workout/plans/${purchase.plan_id}` });
                              }
                            }}
                            className="w-full rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                          >
                            Åpne plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy(pkg.id)}
                            disabled={purchasing === pkg.id}
                            className="w-full rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 transition-colors"
                          >
                            {purchasing === pkg.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Behandler...
                              </span>
                            ) : (
                              "Kjøp"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {packages.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                <div className="mb-4 text-4xl">📦</div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Ingen pakker tilgjengelig</h3>
                <p className="text-sm text-gray-500">Kom tilbake senere for nye treningspakker</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Demo Purchase Success Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center text-4xl">🎉</div>
            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              Kjøp fullført!
            </h3>
            <p className="mb-1 text-center text-sm text-gray-600">
              Treningspakken er lagt til dine planer. Du har {PACKAGE_ACCESS_HOURS} timers tilgang.
            </p>
            <p className="mb-6 text-center text-xs text-gray-400">
              I produksjon vil betaling gå gjennom Stripe. Dette er en demo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDemoModal(false)}
                className="flex-1 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Lukk
              </button>
              {demoPlanId && (
                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate({ to: `/app/workout/plans/${demoPlanId}` });
                  }}
                  className="flex-1 rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                >
                  Åpne plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
