import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getWorkoutPlans, deleteWorkoutPlan } from "~/lib/workout-actions";

export const Route = createFileRoute("/app/workout/plans/")({
  component: WorkoutPlansPage,
});

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  cardio: "Cardio",
  strength: "Strength",
  general: "General Fitness",
};

const GOAL_ICONS: Record<string, string> = {
  weight_loss: "⚖️",
  muscle_gain: "💪",
  cardio: "🏃",
  strength: "🏋️",
  general: "🎯",
};

function WorkoutPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      const data = await getWorkoutPlans();
      setPlans(data);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized")) {
        navigate({ to: "/login" });
      } else {
        setError(e.message || "Failed to load plans");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this workout plan?")) return;
    try {
      await deleteWorkoutPlan({ id });
      setPlans(plans.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete");
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
            <a href="/app/profile" className="text-sm text-gray-600 hover:text-[#1A56DB]">Profile</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Workout Plans</h1>
            <p className="text-gray-500">Create and manage your training programs</p>
          </div>
          <button
            onClick={() => navigate({ to: "/app/workout/plans/create" })}
            className="rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors shadow-sm"
          >
            + New Plan
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mb-4 text-4xl">📋</div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">No workout plans yet</h3>
            <p className="mb-4 text-sm text-gray-500">Create your first training program to get started</p>
            <button
              onClick={() => navigate({ to: "/app/workout/plans/create" })}
              className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Create Plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-[#1A56DB]/20"
                onClick={() => navigate({ to: `/app/workout/plans/${plan.id}` })}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{GOAL_ICONS[plan.goal] || "🎯"}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#1A56DB] transition-colors">
                        {plan.name}
                      </h3>
                      <span className="text-xs font-medium text-gray-400 capitalize">
                        {GOAL_LABELS[plan.goal] || plan.goal}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    className="rounded-full p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete plan"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{plan.exercise_count} exercises</span>
                  <span>·</span>
                  <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
