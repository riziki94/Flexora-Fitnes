import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createWorkoutPlan, type PlanExercise } from "~/lib/workout-actions";
import { getAllExercises, getExerciseName } from "~/lib/muscle-data";
import { MuscleMap } from "~/components/MuscleMap";
import { getMuscleMapping } from "~/lib/muscle-data";

export const Route = createFileRoute("/app/workout/plans/create")({
  component: CreatePlanPage,
});

const GOALS = [
  { value: "weight_loss", label: "Weight Loss", icon: "⚖️" },
  { value: "muscle_gain", label: "Muscle Gain", icon: "💪" },
  { value: "cardio", label: "Cardio", icon: "🏃" },
  { value: "strength", label: "Strength", icon: "🏋️" },
  { value: "general", label: "General Fitness", icon: "🎯" },
];

const PHASES = [
  { value: "warmup", label: "Warmup", color: "bg-amber-100 text-amber-700" },
  { value: "main", label: "Main Workout", color: "bg-blue-100 text-blue-700" },
  { value: "stretching", label: "Stretching/Cool-down", color: "bg-green-100 text-green-700" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ExerciseEntry {
  key: string;
  exercise_key: string;
  exercise_name: string;
  phase: "warmup" | "main" | "stretching";
  day_of_week: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
  sort_order: number;
}

function CreatePlanPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "exercises" | "preview">("info");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("strength");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview muscle state
  const [previewMuscle, setPreviewMuscle] = useState<{ primary: string[]; secondary: string[] } | null>(null);
  const [previewExName, setPreviewExName] = useState("");

  const allExercises = getAllExercises();

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
  }, []);

  function addExercise(phase: "warmup" | "main" | "stretching") {
    const newEx: ExerciseEntry = {
      key: Math.random().toString(36).slice(2, 8),
      exercise_key: "bench_press",
      exercise_name: "Bench Press",
      phase,
      day_of_week: 1,
      sets: 3,
      reps: "10",
      rest_seconds: 60,
      notes: "",
      sort_order: exercises.filter((e) => e.phase === phase).length,
    };
    setExercises([...exercises, newEx]);
  }

  function updateExercise(key: string, field: string, value: any) {
    setExercises(
      exercises.map((ex) => {
        if (ex.key !== key) return ex;
        const updated = { ...ex, [field]: value };
        if (field === "exercise_key") {
          updated.exercise_name = getExerciseName(value);
        }
        return updated;
      })
    );
  }

  function removeExercise(key: string) {
    setExercises(exercises.filter((ex) => ex.key !== key));
  }

  function moveExercise(key: string, direction: "up" | "down") {
    const idx = exercises.findIndex((e) => e.key === key);
    if (idx < 0) return;
    const phase = exercises[idx].phase;
    const phaseExercises = exercises.filter((e) => e.phase === phase);
    const phaseIdx = phaseExercises.findIndex((e) => e.key === key);
    if (direction === "up" && phaseIdx === 0) return;
    if (direction === "down" && phaseIdx === phaseExercises.length - 1) return;

    const swapIdx = direction === "up" ? phaseIdx - 1 : phaseIdx + 1;
    const newExercises = [...exercises];
    const globalIdx = exercises.findIndex((e) => e.key === key);
    const swapGlobalIdx = exercises.findIndex((e) => e.key === phaseExercises[swapIdx].key);
    [newExercises[globalIdx], newExercises[swapGlobalIdx]] = [newExercises[swapGlobalIdx], newExercises[globalIdx]];

    // Update sort_order
    newExercises.forEach((ex, i) => {
      ex.sort_order = newExercises.filter((e) => e.phase === ex.phase).indexOf(ex);
    });

    setExercises(newExercises);
  }

  function handlePreviewMuscle(exerciseKey: string) {
    const mapping = getMuscleMapping(exerciseKey);
    setPreviewMuscle(mapping);
    setPreviewExName(getExerciseName(exerciseKey));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Please enter a plan name");
      return;
    }
    if (exercises.length === 0) {
      setError("Please add at least one exercise");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const planExercises: PlanExercise[] = exercises.map((ex) => ({
        exercise_key: ex.exercise_key,
        exercise_name: ex.exercise_name,
        phase: ex.phase,
        day_of_week: ex.day_of_week,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        sort_order: ex.sort_order,
      }));

      const result = await createWorkoutPlan({
        name: name.trim(),
        goal: goal as any,
        days_per_week: daysPerWeek,
        exercises: planExercises,
      });

      navigate({ to: `/app/workout/plans/${result.id}` });
    } catch (e: any) {
      setError(e.message || "Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  const warmupExercises = exercises.filter((e) => e.phase === "warmup");
  const mainExercises = exercises.filter((e) => e.phase === "main");
  const stretchExercises = exercises.filter((e) => e.phase === "stretching");

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
            <a href="/app/workout/plans" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Plans</a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Steps */}
        <div className="mb-8 flex items-center gap-3">
          {["info", "exercises", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <button
                onClick={() => setStep(s as any)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-[#1A56DB] text-white"
                    : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                }`}
              >
                {i + 1}
              </button>
              <span className={`text-sm ${step === s ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {s === "info" ? "Plan Info" : s === "exercises" ? "Exercises" : "Preview"}
              </span>
              {i < 2 && <div className="h-px w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Step 1: Plan Info */}
        {step === "info" && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">Plan Details</h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Full Body Strength Builder"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Goal</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                      goal === g.value
                        ? "border-[#1A56DB] bg-blue-50 text-[#1A56DB]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-xs font-medium">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Days Per Week: <span className="font-bold text-[#1A56DB]">{daysPerWeek}</span>
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full accent-[#1A56DB]"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                {DAYS.slice(0, daysPerWeek).map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("exercises")}
              className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Continue to Exercises →
            </button>
          </div>
        )}

        {/* Step 2: Exercises */}
        {step === "exercises" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Warmup */}
              <PhaseSection
                phase="warmup"
                label="Warmup"
                color="bg-amber-100 text-amber-700 border-amber-200"
                exercises={warmupExercises}
                allExercises={allExercises}
                daysPerWeek={daysPerWeek}
                onAdd={() => addExercise("warmup")}
                onUpdate={updateExercise}
                onRemove={removeExercise}
                onMove={moveExercise}
                onHoverExercise={handlePreviewMuscle}
              />

              {/* Main */}
              <PhaseSection
                phase="main"
                label="Main Workout"
                color="bg-blue-100 text-blue-700 border-blue-200"
                exercises={mainExercises}
                allExercises={allExercises}
                daysPerWeek={daysPerWeek}
                onAdd={() => addExercise("main")}
                onUpdate={updateExercise}
                onRemove={removeExercise}
                onMove={moveExercise}
                onHoverExercise={handlePreviewMuscle}
              />

              {/* Stretching */}
              <PhaseSection
                phase="stretching"
                label="Stretching / Cool-down"
                color="bg-green-100 text-green-700 border-green-200"
                exercises={stretchExercises}
                allExercises={allExercises}
                daysPerWeek={daysPerWeek}
                onAdd={() => addExercise("stretching")}
                onUpdate={updateExercise}
                onRemove={removeExercise}
                onMove={moveExercise}
                onHoverExercise={handlePreviewMuscle}
              />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep("info")}
                  className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep("preview")}
                  className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
                >
                  Preview Plan →
                </button>
              </div>
            </div>

            {/* Muscle Map Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Muscle Map</h3>
                <MuscleMap
                  activeMuscles={previewMuscle}
                  exerciseName={previewExName || "Hover an exercise"}
                  height={320}
                />
                {!previewMuscle && (
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Hover over an exercise to see muscles worked
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Review Your Plan</h2>

            <div className="mb-4 rounded-lg bg-blue-50 p-4">
              <h3 className="text-lg font-bold text-[#1A56DB]">{name || "Untitled Plan"}</h3>
              <p className="text-sm text-gray-500 capitalize">
                {GOALS.find((g) => g.value === goal)?.icon} {GOALS.find((g) => g.value === goal)?.label} · {daysPerWeek} days/week · {exercises.length} exercises
              </p>
            </div>

            {(["warmup", "main", "stretching"] as const).map((phase) => {
              const phaseExs = exercises.filter((e) => e.phase === phase);
              if (phaseExs.length === 0) return null;
              const phaseInfo = PHASES.find((p) => p.value === phase)!;
              return (
                <div key={phase} className="mb-4">
                  <h4 className={`mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${phaseInfo.color}`}>
                    {phaseInfo.label}
                  </h4>
                  <div className="space-y-2">
                    {phaseExs.map((ex) => (
                      <div key={ex.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{ex.exercise_name}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {ex.sets}×{ex.reps} · {ex.rest_seconds}s rest
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">Day {ex.day_of_week}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep("exercises")}
                className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                ← Edit Exercises
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Plan ✓"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PhaseSection({
  phase,
  label,
  color,
  exercises,
  allExercises,
  daysPerWeek,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onHoverExercise,
}: {
  phase: string;
  label: string;
  color: string;
  exercises: ExerciseEntry[];
  allExercises: any[];
  daysPerWeek: number;
  onAdd: () => void;
  onUpdate: (key: string, field: string, value: any) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, direction: "up" | "down") => void;
  onHoverExercise: (key: string) => void;
}) {
  const phaseExercises = allExercises.filter((ex) => {
    if (phase === "warmup") return ex.category === "warmup" || ex.category === "cardio";
    if (phase === "stretching") return ex.category === "stretching";
    return ex.category === "strength" || ex.category === "core" || ex.category === "cardio";
  });

  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`rounded-full px-3 py-0.5 text-xs font-semibold ${color}`}>{label}</h3>
        <button
          onClick={onAdd}
          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
        >
          + Add
        </button>
      </div>

      {exercises.length === 0 ? (
        <p className="py-3 text-center text-xs text-gray-400">
          No {label.toLowerCase()} exercises added yet
        </p>
      ) : (
        <div className="space-y-2">
          {exercises.map((ex, idx) => (
            <div
              key={ex.key}
              className="rounded-lg border border-gray-100 bg-gray-50/50 p-3"
              onMouseEnter={() => onHoverExercise(ex.exercise_key)}
            >
              <div className="mb-2 flex items-center justify-between">
                <select
                  value={ex.exercise_key}
                  onChange={(e) => onUpdate(ex.key, "exercise_key", e.target.value)}
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-[#1A56DB] focus:outline-none"
                >
                  {phaseExercises.map((pex) => (
                    <option key={pex.key} value={pex.key}>{pex.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMove(ex.key, "up")}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onMove(ex.key, "down")}
                    disabled={idx === exercises.length - 1}
                    className="rounded p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => onRemove(ex.key)}
                    className="ml-1 rounded p-0.5 text-gray-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">Sets</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ex.sets}
                    onChange={(e) => onUpdate(ex.key, "sets", Number(e.target.value))}
                    className="w-12 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-center focus:border-[#1A56DB] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">Reps</label>
                  <input
                    type="text"
                    value={ex.reps}
                    onChange={(e) => onUpdate(ex.key, "reps", e.target.value)}
                    className="w-14 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-center focus:border-[#1A56DB] focus:outline-none"
                    placeholder="10-12"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">Rest(s)</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={ex.rest_seconds}
                    onChange={(e) => onUpdate(ex.key, "rest_seconds", Number(e.target.value))}
                    className="w-14 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-center focus:border-[#1A56DB] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">Day</label>
                  <select
                    value={ex.day_of_week}
                    onChange={(e) => onUpdate(ex.key, "day_of_week", Number(e.target.value))}
                    className="rounded border border-gray-200 bg-white px-1 py-0.5 text-xs focus:border-[#1A56DB] focus:outline-none"
                  >
                    {Array.from({ length: daysPerWeek }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={ex.notes}
                onChange={(e) => onUpdate(ex.key, "notes", e.target.value)}
                placeholder="Notes (optional)"
                className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-[#1A56DB] focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
