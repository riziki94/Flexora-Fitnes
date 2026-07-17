import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getWorkoutPlan, markExerciseDone } from "~/lib/workout-actions";
import { MuscleMap } from "~/components/MuscleMap";
import { getMuscleMapping, getExerciseName } from "~/lib/muscle-data";

export const Route = createFileRoute("/app/workout/plans/$id")({
  component: PlanDetailPage,
});

const PHASE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  warmup: { label: "Warmup", color: "text-amber-700", bg: "bg-amber-100" },
  main: { label: "Main Workout", color: "text-blue-700", bg: "bg-blue-100" },
  stretching: { label: "Stretching", color: "text-green-700", bg: "bg-green-100" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PlanDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const planId = Number(id);
  const [plan, setPlan] = useState<any>(null);
  const [days, setDays] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7);
  const [activeMuscle, setActiveMuscle] = useState<{ primary: string[]; secondary: string[] } | null>(null);
  const [activeExName, setActiveExName] = useState("");
  const [restTimer, setRestTimer] = useState<{ exerciseId: number; seconds: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    loadPlan();
  }, [id]);

  useEffect(() => {
    if (!restTimer || restTimer.seconds <= 0) return;
    const interval = setInterval(() => {
      setRestTimer((prev) => { if (!prev || prev.seconds <= 1) return null; return { ...prev, seconds: prev.seconds - 1 }; });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  async function loadPlan() {
    try {
      setLoading(true);
      const data = await getWorkoutPlan({ id: planId });
      setPlan(data.plan); setDays(data.days);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized")) navigate({ to: "/login" });
      else setError(e.message || "Failed to load plan");
    } finally { setLoading(false); }
  }

  async function handleToggleDone(exerciseId: number, currentCompleted: boolean) {
    try {
      await markExerciseDone({ planId, exerciseId, completed: !currentCompleted });
      setDays((prev: any) => {
        const updated = { ...prev };
        for (const d in updated) {
          for (const phase of ["warmup", "main", "stretching"]) {
            updated[d][phase] = updated[d][phase].map((ex: any) => {
              if (ex.id === exerciseId) return { ...ex, completed: !currentCompleted };
              return ex;
            });
          }
        }
        return updated;
      });
    } catch (e: any) { setError(e.message || "Failed to update"); }
  }

  function handleExerciseHover(exerciseKey: string) {
    const mapping = getMuscleMapping(exerciseKey);
    setActiveMuscle(mapping); setActiveExName(getExerciseName(exerciseKey));
  }

  function handleStartRest(exerciseId: number, seconds: number) {
    setRestTimer({ exerciseId, seconds });
  }

  const todayExercises = days[selectedDay] || { warmup: [], main: [], stretching: [] };
  const totalExercises = (todayExercises.warmup?.length || 0) + (todayExercises.main?.length || 0) + (todayExercises.stretching?.length || 0);
  const completedCount = (todayExercises.warmup?.filter((e: any) => e.completed).length || 0) + (todayExercises.main?.filter((e: any) => e.completed).length || 0) + (todayExercises.stretching?.filter((e: any) => e.completed).length || 0);
  const progressPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2"><span className="text-lg font-bold text-[#1A56DB]">Flexora</span><span className="text-lg font-light text-gray-400">Fitnes</span></a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/workout/plans" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Plans</a>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" /></div>
        : error ? <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        : plan ? <>
          <div className="mb-6">
            <a href="/app/workout/plans" className="mb-3 inline-block text-sm text-gray-400 hover:text-[#1A56DB]">← Back to Plans</a>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1><p className="text-sm text-gray-500 capitalize">{plan.goal.replace("_", " ")}</p></div>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1A56DB" strokeWidth="6" strokeDasharray={`${progressPct * 1.76} 176`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#1A56DB]">{progressPct}%</span>
                </div>
                <div className="text-sm text-gray-500">{completedCount}/{totalExercises} done</div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-100">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => {
                  const dayExs = days[d] || { warmup: [], main: [], stretching: [] };
                  if (!(dayExs.warmup.length + dayExs.main.length + dayExs.stretching.length)) return null;
                  return <button key={d} onClick={() => setSelectedDay(d)} className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${selectedDay === d ? "bg-[#1A56DB] text-white" : "text-gray-500 hover:bg-gray-100"}`}>{DAY_NAMES[d - 1]}</button>;
                })}
              </div>
              {(["warmup", "main", "stretching"] as const).map((phase) => {
                const phaseExs = todayExercises[phase] || [];
                if (phaseExs.length === 0) return null;
                const phaseInfo = PHASE_LABELS[phase];
                return (
                  <div key={phase} className="mb-4">
                    <h3 className={`mb-3 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${phaseInfo.color} ${phaseInfo.bg}`}>{phaseInfo.label}</h3>
                    <div className="space-y-2">
                      {phaseExs.map((ex: any) => {
                        const isResting = restTimer?.exerciseId === ex.id;
                        return (
                          <div key={ex.id} className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all ${ex.completed ? "border-green-200 bg-green-50/50" : "border-gray-100 hover:border-[#1A56DB]/20"}`} onMouseEnter={() => handleExerciseHover(ex.exercise_key)}>
                            <button onClick={() => handleToggleDone(ex.id, ex.completed)} className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${ex.completed ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-[#1A56DB]"}`}>
                              {ex.completed && <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${ex.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>{ex.exercise_name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400"><span>{ex.sets} sets</span><span>·</span><span>{ex.reps} reps</span><span>·</span><span>Rest: {ex.rest_seconds}s</span>{ex.notes && <><span>·</span><span className="italic">{ex.notes}</span></>}</div>
                            </div>
                            {!ex.completed && (
                              <button onClick={() => handleStartRest(ex.id, ex.rest_seconds)} className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${isResting ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-500 hover:bg-[#1A56DB]/10 hover:text-[#1A56DB]"}`}>
                                {isResting ? <span className="flex items-center gap-1"><svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" /></svg>{restTimer!.seconds}s</span> : "▶ Rest"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {totalExercises === 0 && <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center"><p className="text-sm text-gray-500">No exercises scheduled for this day</p><p className="mt-1 text-xs text-gray-400">Select a different day above</p></div>}
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Muscle Map</h3>
                <MuscleMap activeMuscles={activeMuscle} exerciseName={activeExName || "Hover an exercise"} height={360} />
                {!activeMuscle && <p className="mt-2 text-center text-xs text-gray-400">Hover over an exercise to see targeted muscles</p>}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Summary</h4>
                  <div className="space-y-1 text-xs">
                    {(["warmup", "main", "stretching"] as const).map((phase) => {
                      const phaseExs = todayExercises[phase] || [];
                      if (phaseExs.length === 0) return null;
                      const done = phaseExs.filter((e: any) => e.completed).length;
                      return <div key={phase} className="flex justify-between text-gray-500"><span>{PHASE_LABELS[phase].label}</span><span className="font-medium">{done}/{phaseExs.length}</span></div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </> : null}
      </main>
    </div>
  );
}
