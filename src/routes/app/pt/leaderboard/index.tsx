import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPtLeaderboard, getPtLeaderboardCountries } from "~/lib/pt-ratings-actions";

export const Route = createFileRoute("/app/pt/leaderboard/")({
  component: PtLeaderboardPage,
});

function PtLeaderboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [period, setPeriod] = useState<"monthly" | "alltime">("monthly");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try { setUser(JSON.parse(stored)); } catch { navigate({ to: "/login" }); return; }
    loadData();
    getPtLeaderboardCountries().then(setCountries).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getPtLeaderboard({ country: country || undefined, period });
      setLeaderboard(data);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [country, period]);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  function getMedal(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  }

  function getRatingColor(pct: number) {
    if (pct >= 80) return "text-green-600";
    if (pct >= 50) return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/pt/discover" className="text-sm text-gray-600 hover:text-[#1A56DB]">Discover</a>
            <a href="/app/bookings" className="text-sm text-gray-600 hover:text-[#1A56DB]">Bookings</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">PT Leaderboard</h1>
          <p className="text-gray-500">Top-rated personal trainers on Flexora Fitnes</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-200">
            {(["monthly", "alltime"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-[#1A56DB] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p === "monthly" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A56DB]"
          >
            <option value="">🌍 All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-gray-500">No PT ratings yet for this period.</p>
            <a
              href="/app/pt/discover"
              className="mt-4 inline-block rounded-lg bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              Find a Trainer
            </a>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {leaderboard.slice(0, 3).map((pt, idx) => {
                const realRank = pt.rank;
                const medals = ["🥇", "🥈", "🥉"];
                const cardOrder = idx === 0 ? "order-2 sm:order-2" : idx === 1 ? "order-1 sm:order-1" : "order-3 sm:order-3";
                return (
                  <div key={pt.id} className={`${cardOrder} rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 text-center`}>
                    <div className="text-3xl mb-2">{medals[idx]}</div>
                    <a href={`/app/pt/${pt.id}`} className="text-base font-semibold text-gray-900 hover:text-[#1A56DB]">
                      {pt.name}
                    </a>
                    <p className="text-xs text-gray-400">{pt.country || "—"}</p>
                    <p className={`mt-2 text-2xl font-bold ${getRatingColor(pt.ratingPct)}`}>
                      {pt.ratingPct}%
                    </p>
                    <p className="text-xs text-gray-400">{pt.totalRatings} ratings · {pt.yearsOfExperience} yrs exp</p>
                  </div>
                );
              })}
            </div>

            {/* Full leaderboard table */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 hidden sm:table-cell">Country</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400">Rating</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400 hidden sm:table-cell">Ratings</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400 hidden sm:table-cell">Exp.</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((pt: any) => (
                    <tr key={pt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900">
                          {getMedal(pt.rank) || pt.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/app/pt/${pt.id}`} className="text-sm font-medium text-gray-900 hover:text-[#1A56DB]">
                          {pt.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{pt.country || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-bold ${getRatingColor(pt.ratingPct)}`}>
                          {pt.ratingPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500 hidden sm:table-cell">{pt.totalRatings}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500 hidden sm:table-cell">{pt.yearsOfExperience} yrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
