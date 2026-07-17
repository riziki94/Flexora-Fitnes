import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCompetitions, getMyCompetitions, joinCompetition } from "~/lib/competition-actions";

export const Route = createFileRoute("/app/competitions/")({
  component: CompetitionsPage,
});

const TYPE_LABELS: Record<string, string> = {
  reps: "Most Reps",
  duration: "Longest Duration",
  consistency: "Most Consistent",
  weight_loss: "Weight Loss Challenge",
};

const TYPE_ICONS: Record<string, string> = {
  reps: "🏋️",
  duration: "⏱️",
  consistency: "📅",
  weight_loss: "⚖️",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-500",
};

function CompetitionsPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "my_country" | "global" | "mine">("all");
  const [user, setUser] = useState<any>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

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
    loadCompetitions();
  }, [filter]);

  async function loadCompetitions() {
    try {
      setLoading(true);
      setError("");
      let data: any[];
      if (filter === "mine") {
        data = await getMyCompetitions();
      } else {
        data = await getCompetitions();
      }
      // Client-side filtering
      if (filter === "my_country" && user) {
        data = data.filter((c: any) => c.country_scope === "my_country");
      } else if (filter === "global") {
        data = data.filter((c: any) => c.country_scope === "global");
      }
      setCompetitions(data);
    } catch (e: any) {
      setError(e.message || "Failed to load competitions");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(id: number) {
    try {
      setJoiningId(id);
      await joinCompetition({ competitionId: id });
      loadCompetitions();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoiningId(null);
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
            <a href="/app/competitions/leaderboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Leaderboard</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competitions</h1>
            <p className="text-gray-500">Compete with others and win prizes</p>
          </div>
          <button
            onClick={() => navigate({ to: "/app/competitions/create" })}
            className="rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors shadow-sm"
          >
            + Create Competition
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(["all", "my_country", "global", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#1A56DB] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "my_country" ? "My Country" : f === "global" ? "Global" : "My Competitions"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mb-4 text-4xl">🏆</div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">No competitions found</h3>
            <p className="mb-4 text-sm text-gray-500">
              {filter === "mine" ? "Join a competition to see it here" : "Be the first to create one!"}
            </p>
            <button
              onClick={() => navigate({ to: "/app/competitions/create" })}
              className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Create Competition
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((comp) => (
              <div
                key={comp.id}
                className="cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-[#1A56DB]/20"
                onClick={() => navigate({ to: `/app/competitions/${comp.id}` })}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 text-3xl">{TYPE_ICONS[comp.type] || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{comp.name}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[comp.status]}`}>
                        {comp.status}
                      </span>
                      <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {comp.country_scope === "global" ? "🌍 Global" : "🏠 Country"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{comp.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="font-medium text-[#1A56DB]">{TYPE_LABELS[comp.type] || comp.type}</span>
                      <span>·</span>
                      <span>{new Date(comp.start_date).toLocaleDateString()} — {new Date(comp.end_date).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{comp.participant_count} participants</span>
                      {comp.prize && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600 font-medium">🏅 {comp.prize}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoin(comp.id);
                    }}
                    disabled={joiningId === comp.id || comp.status === "ended"}
                    className="shrink-0 rounded-full bg-green-500 px-4 py-2 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {joiningId === comp.id ? "..." : comp.status === "ended" ? "Ended" : "Join"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
