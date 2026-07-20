import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import Avatar from "~/components/Avatar";
import {
  getCompetitionDetail,
  joinCompetition,
  leaveCompetition,
  isUserInCompetition,
} from "~/lib/competition-actions";

export const Route = createFileRoute("/app/competitions/$id")({
  component: CompetitionDetailPage,
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

const MEDAL_EMOJI: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function CompetitionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/app/competitions/$id" }) as { id: string };
  const compId = parseInt(id);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [shareTooltip, setShareTooltip] = useState(false);

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
    if (user) loadDetail();
  }, [compId, user]);

  // Countdown timer
  useEffect(() => {
    if (!detail?.competition) return;
    const comp = detail.competition;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      let target: number;
      let prefix: string;

      if (comp.status === "upcoming") {
        target = new Date(comp.start_date).getTime();
        prefix = "Starts in ";
      } else if (comp.status === "active") {
        target = new Date(comp.end_date).getTime();
        prefix = "Ends in ";
      } else {
        setCountdown("Ended");
        return;
      }

      const diff = target - now;
      if (diff <= 0) {
        setCountdown(comp.status === "upcoming" ? "Starting..." : "Ending...");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${prefix}${days}d ${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(timer);
  }, [detail]);

  async function loadDetail() {
    try {
      setLoading(true);
      setError("");
      const [det, joined] = await Promise.all([
        getCompetitionDetail({ id: compId }),
        isUserInCompetition({ competitionId: compId }),
      ]);
      setDetail(det);
      setHasJoined(joined);
    } catch (e: any) {
      setError(e.message || "Failed to load competition");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    try {
      setActionLoading(true);
      await joinCompetition({ competitionId: compId });
      setHasJoined(true);
      loadDetail();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this competition?")) return;
    try {
      setActionLoading(true);
      await leaveCompetition({ competitionId: compId });
      setHasJoined(false);
      loadDetail();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    }).catch(() => {
      // fallback
      prompt("Copy this link:", url);
    });
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate({ to: "/app/competitions" })} className="text-[#1A56DB] hover:underline text-sm">
            ← Back to Competitions
          </button>
        </div>
      </div>
    );
  }

  const comp = detail?.competition;
  const participants = detail?.participants || [];
  const activity = detail?.activity || [];

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
            <a href="/app/competitions/leaderboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Leaderboard</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Back link */}
        <button onClick={() => navigate({ to: "/app/competitions" })} className="text-sm text-gray-500 hover:text-[#1A56DB] mb-4 inline-block">
          ← Back to Competitions
        </button>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Competition Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 mb-6">
          <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{TYPE_ICONS[comp.type] || "🏆"}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{comp.name}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[comp.status]}`}>
                    {comp.status}
                  </span>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {comp.country_scope === "global" ? "🌍 Global" : "🏠 Country"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Created by {comp.creator_name} · {TYPE_LABELS[comp.type] || comp.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  📤 Share
                </button>
                {shareTooltip && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap">
                    Link copied!
                  </span>
                )}
              </div>
              {comp.status !== "ended" && (
                hasJoined ? (
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Joining..." : "Join Competition"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Countdown */}
          {countdown && (
            <div className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
              comp.status === "active" ? "bg-green-100 text-green-700" :
              comp.status === "upcoming" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-500"
            }`}>
              ⏱️ {countdown}
            </div>
          )}

          {/* Description */}
          {comp.description && (
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">{comp.description}</p>
          )}

          {/* Meta */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>📅 {new Date(comp.start_date).toLocaleDateString()} — {new Date(comp.end_date).toLocaleDateString()}</span>
            <span>·</span>
            <span>👥 {comp.participant_count} / {comp.max_participants > 0 ? comp.max_participants : "∞"} participants</span>
            {comp.prize && (
              <>
                <span>·</span>
                <span className="text-amber-600 font-medium">🏅 Prize: {comp.prize}</span>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 Leaderboard</h2>
              {participants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No participants yet. Be the first to join!</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Athlete</div>
                    <div className="col-span-3 text-right">Score</div>
                    <div className="col-span-3 text-right">Country</div>
                  </div>
                  {participants.map((p: any, i: number) => (
                    <div
                      key={p.id}
                      className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-sm rounded-lg ${
                        i < 3 ? "bg-yellow-50/50" : "hover:bg-gray-50"
                      } ${user && p.user_id === user.id ? "ring-1 ring-[#1A56DB]/30 bg-blue-50/50" : ""}`}
                    >
                      <div className="col-span-1">
                        {i < 3 ? (
                          <span className="text-base">{MEDAL_EMOJI[i + 1]}</span>
                        ) : (
                          <span className="text-gray-400 font-medium">{i + 1}</span>
                        )}
                      </div>
                      <div className="col-span-5 font-medium text-gray-900 truncate">
                        {p.name}
                        {user && p.user_id === user.id && (
                          <span className="ml-1.5 text-xs text-[#1A56DB] font-normal">(You)</span>
                        )}
                      </div>
                      <div className="col-span-3 text-right font-semibold text-[#1A56DB]">{p.score.toLocaleString()}</div>
                      <div className="col-span-3 text-right text-xs text-gray-500">{p.country || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 Activity Feed</h2>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                        {a.activity_type === "join" ? "👋" : a.activity_type === "entry" ? "💪" : "📊"}
                      </span>
                      <div>
                        <p className="text-gray-700">{a.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prize */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Prize</h3>
              {comp.prize ? (
                <div className="rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-center border border-amber-200">
                  <div className="text-3xl mb-2">🏅</div>
                  <p className="font-semibold text-gray-900">{comp.prize}</p>
                  <p className="text-xs text-gray-500 mt-1">Winner takes it all!</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">TBD — Sponsor prize coming soon</p>
              )}
            </div>

            {/* Participants */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Participants ({participants.length})
              </h3>
              {participants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No participants yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Avatar src={p.profile_picture} name={p.name} size={24} />
                      <span className="text-gray-700 truncate">{p.name}</span>
                      {p.score > 0 && (
                        <span className="ml-auto text-xs font-medium text-[#1A56DB]">{p.score}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900">{TYPE_LABELS[comp.type] || comp.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Scope</span>
                  <span className="font-medium text-gray-900">{comp.country_scope === "global" ? "Global" : "Country Only"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max</span>
                  <span className="font-medium text-gray-900">{comp.max_participants > 0 ? comp.max_participants : "Unlimited"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium text-gray-900">{new Date(comp.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
