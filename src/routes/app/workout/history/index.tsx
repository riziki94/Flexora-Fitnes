import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getSessionHistory } from "~/lib/session-actions";

export const Route = createFileRoute("/app/workout/history/")({
  component: SessionHistoryPage,
});

function SessionHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check auth
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    getSessionHistory()
      .then(setSessions)
      .catch((e: any) => setError(e.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, [navigate]);

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <a href="/app/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/workout/plans" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Plans</a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
          <p className="text-sm text-gray-500">Your completed workout sessions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-lg font-medium text-gray-400">No sessions yet</p>
            <p className="mt-1 text-sm text-gray-400">Complete a workout to see it here</p>
            <a
              href="/app/workout/plans"
              className="mt-4 inline-block rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              Start a Workout →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <div key={s.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:ring-[#1A56DB]/20 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{s.plan_name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{s.plan_goal?.replace("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(s.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.started_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">⏱</span>
                    <span className="font-medium text-gray-700">{formatDuration(s.duration_seconds || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">🏋</span>
                    <span className="font-medium text-gray-700">{s.exercise_count} exercises</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">🔥</span>
                    <span className="font-medium text-gray-700">{s.calories_estimated || 0} cal</span>
                  </div>
                  {s.ended_at ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-600">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
