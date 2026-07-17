import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getLeaderboard, getLeaderboardByCountry, getAllCountries } from "~/lib/competition-actions";

export const Route = createFileRoute("/app/competitions/leaderboard/")({
  component: LeaderboardPage,
});

const MEDAL_COLORS: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-300 ring-yellow-200",
  2: "bg-gray-50 border-gray-300 ring-gray-200",
  3: "bg-amber-50 border-amber-300 ring-amber-200",
};

const MEDAL_EMOJI: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCountry]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [leaderboardData, countriesData] = await Promise.all([
        selectedCountry ? getLeaderboardByCountry({ country: selectedCountry }) : getLeaderboard(),
        getAllCountries(),
      ]);
      setLeaderboard(leaderboardData);
      setCountries(countriesData);
    } catch (e: any) {
      setError(e.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    navigate({ to: "/" });
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
            <a href="/app/competitions" className="text-sm text-gray-600 hover:text-[#1A56DB]">Competitions</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🏆 Global Leaderboard</h1>
          <p className="text-gray-500">See how you rank against others worldwide</p>
        </div>

        {/* Country Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
          >
            <option value="">🌍 All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mb-4 text-4xl">🏆</div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">No rankings yet</h3>
            <p className="text-sm text-gray-500">Complete workout sessions to earn points and appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 Podium */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              {[2, 1, 3].map((pos) => {
                const entry = leaderboard[pos - 1];
                if (!entry) return <div key={pos} />;
                return (
                  <div
                    key={pos}
                    className={`rounded-xl p-4 text-center ring-1 ${
                      pos === 1
                        ? "bg-gradient-to-b from-yellow-50 to-yellow-100 ring-yellow-300 scale-105"
                        : pos === 2
                        ? "bg-gray-50 ring-gray-200"
                        : "bg-amber-50 ring-amber-200"
                    }`}
                  >
                    <div className="text-3xl mb-1">{MEDAL_EMOJI[pos]}</div>
                    <p className={`font-bold ${pos === 1 ? "text-lg" : "text-base"} text-gray-900 truncate`}>
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-500">{entry.country || "—"}</p>
                    <p className="mt-1 text-lg font-bold text-[#1A56DB]">{entry.points.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                );
              })}
            </div>

            {/* Full leaderboard table */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Athlete</div>
                <div className="col-span-2 text-right">Points</div>
                <div className="col-span-2 text-right">Workouts</div>
                <div className="col-span-2 text-right">Country</div>
              </div>
              {leaderboard.map((entry) => {
                const isCurrentUser = user && entry.id === user.id;
                const isTop3 = entry.rank <= 3;
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                      isCurrentUser
                        ? "bg-blue-50 ring-1 ring-[#1A56DB]/20"
                        : isTop3
                        ? MEDAL_COLORS[entry.rank] || ""
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="col-span-1">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">{MEDAL_EMOJI[entry.rank]}</span>
                      ) : (
                        <span className="font-medium text-gray-400">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 font-medium text-gray-900 truncate">
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-2 inline-block rounded-full bg-[#1A56DB] px-2 py-0.5 text-xs text-white font-normal">You</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-[#1A56DB]">{entry.points.toLocaleString()}</div>
                    <div className="col-span-2 text-right text-gray-500">{entry.workouts_completed}</div>
                    <div className="col-span-2 text-right text-gray-500 text-xs">{entry.country || "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
