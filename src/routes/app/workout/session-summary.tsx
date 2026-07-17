import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getSessionSummary } from "~/lib/session-actions";

export const Route = createFileRoute("/app/workout/session-summary")({
  component: SessionSummaryPage,
  validateSearch: (search: Record<string, string>) => ({
    sessionId: search.sessionId || "",
    planId: search.planId || "",
  }),
});

const EFFORT_LABELS: Record<string, { label: string }> = {
  green: { label: "Moderate" },
  yellow: { label: "Challenging" },
  red: { label: "Maximum" },
};

function EffortBar({ level, count, total }: { level: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorClass = level === "green"
    ? "bg-green-500"
    : level === "yellow"
    ? "bg-yellow-500"
    : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${colorClass}`} />
      <span className="flex-1 text-sm text-gray-600">{EFFORT_LABELS[level]?.label || level}</span>
      <span className="text-sm font-medium text-gray-900">{count}</span>
      <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function EffortDot({ level }: { level: string }) {
  if (level === "green") return <span className="h-2.5 w-2.5 rounded-full bg-green-500" />;
  if (level === "yellow") return <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />;
  if (level === "red") return <span className="h-2.5 w-2.5 rounded-full bg-red-500" />;
  return null;
}

function PhaseBadge({ phase }: { phase: string }) {
  if (phase === "warmup") return <span className="inline-block rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-600">WARMUP</span>;
  if (phase === "stretching") return <span className="inline-block rounded-full bg-purple-100 px-3 py-0.5 text-xs font-semibold text-purple-600">STRETCHING</span>;
  return <span className="inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-600">MAIN</span>;
}

function SessionSummaryPage() {
  const search = Route.useSearch();
  const sessionId = Number(search.sessionId);
  const planId = search.planId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }
    getSessionSummary({ sessionId })
      .then(setData)
      .catch((e: any) => setError(e.message || "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error || "No data"}</div>
      </div>
    );
  }

  const { session, exercises, plan } = data;
  const durationMin = Math.floor((session.duration_seconds || 0) / 60);
  const durationSec = (session.duration_seconds || 0) % 60;

  // Effort breakdown
  const effortCounts: Record<string, number> = { green: 0, yellow: 0, red: 0 };
  exercises.forEach((ex: any) => {
    if (ex.effort_level && effortCounts[ex.effort_level] !== undefined) {
      effortCounts[ex.effort_level]++;
    }
  });

  // Group by phase
  const byPhase: Record<string, any[]> = { warmup: [], main: [], stretching: [] };
  exercises.forEach((ex: any) => {
    const phase = ex.phase || "main";
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(ex);
  });

  const totalEffort = effortCounts.green + effortCounts.yellow + effortCounts.red;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <a href="/app/dashboard" className="text-sm text-gray-500 hover:text-[#1A56DB]">← Dashboard</a>
          <span className="text-sm font-semibold text-gray-700">Session Summary</span>
          <a href="/app/workout/history" className="text-sm text-[#1A56DB] hover:underline">History</a>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] p-8 text-white">
          <p className="text-sm font-medium text-blue-200">Workout Complete!</p>
          <h1 className="mt-2 text-3xl font-bold">{plan.name}</h1>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-3xl font-bold">{durationMin}:{durationSec.toString().padStart(2, "0")}</p>
              <p className="text-xs text-blue-200">Duration</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{exercises.length}</p>
              <p className="text-xs text-blue-200">Exercises</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{session.calories_estimated || 0}</p>
              <p className="text-xs text-blue-200">Calories (est.)</p>
            </div>
          </div>
        </div>

        {/* Effort breakdown */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Effort Breakdown</h3>
          {totalEffort > 0 ? (
            <div className="space-y-3">
              <EffortBar level="green" count={effortCounts.green || 0} total={totalEffort} />
              <EffortBar level="yellow" count={effortCounts.yellow || 0} total={totalEffort} />
              <EffortBar level="red" count={effortCounts.red || 0} total={totalEffort} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">No effort ratings recorded</p>
          )}
        </div>

        {/* Exercise log */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Exercises Completed</h3>
          {(["warmup", "main", "stretching"] as const).map((phase) => {
            const phaseExs = byPhase[phase] || [];
            if (phaseExs.length === 0) return null;
            return (
              <div key={phase} className="mb-4">
                <h4 className="mb-2">
                  <PhaseBadge phase={phase} />
                </h4>
                <div className="space-y-2">
                  {phaseExs.map((ex: any) => (
                    <div key={ex.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                      <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{ex.exercise_name}</p>
                        <p className="text-xs text-gray-400">{ex.sets_completed} sets × {ex.reps} reps</p>
                      </div>
                      {ex.effort_level && <EffortDot level={ex.effort_level} />}
                      {ex.breaths_per_minute > 0 && (
                        <span className="text-xs text-gray-400">{ex.breaths_per_minute} bpm</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rate your PT prompt */}
        <div className="mt-6 rounded-xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⭐</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">Did you work with a PT?</h3>
              <p className="mt-1 text-sm text-amber-600">
                Rate your personal trainer and help others find the best fit.
              </p>
              <a
                href="/app/bookings"
                className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Rate Your PT →
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <a
            href="/app/workout/history"
            className="flex-1 rounded-xl bg-[#1A56DB] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
          >
            View History
          </a>
          <a
            href={planId ? `/app/workout/plans/${planId}` : "/app/workout/plans"}
            className="flex-1 rounded-xl bg-gray-100 px-6 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Back to Plan
          </a>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          Completed {new Date(session.started_at).toLocaleString()}
        </p>
      </main>
    </div>
  );
}
