import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/nutrition")({
  component: NutritionLogPage,
});

const DAILY_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70 };

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};
const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍿",
};

function NutritionLogPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    setUser(JSON.parse(stored));
  }, []);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { getFoodLogsForDate, getDailyTotals } = await import("~/lib/nutrition-actions");

      const [logs, dailyTotals] = await Promise.all([
        getFoodLogsForDate({ data: { userId: user.id, date: logDate } }),
        getDailyTotals({ data: { userId: user.id, date: logDate } }),
      ]);

      setFoodLogs(Array.isArray(logs) ? logs : []);
      setTotals(dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (e) {
      console.error("Failed to load food logs", e);
      setFoodLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user, logDate]);

  useEffect(() => {
    if (user) loadLogs();
  }, [user, logDate, loadLogs]);

  async function handleDelete(logId: number) {
    const { deleteFoodLog } = await import("~/lib/nutrition-actions");
    await deleteFoodLog({ data: { logId, userId: user.id } });
    loadLogs();
  }

  function changeDate(days: number) {
    const d = new Date(logDate);
    d.setDate(d.getDate() + days);
    setLogDate(d.toISOString().slice(0, 10));
  }

  const isToday = logDate === new Date().toISOString().slice(0, 10);
  const dateLabel = isToday ? "Today" : new Date(logDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const groupedLogs: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const log of foodLogs) {
    const mt = log.meal_type || "snack";
    if (!groupedLogs[mt]) groupedLogs[mt] = [];
    groupedLogs[mt].push(log);
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/nutrition" className="text-sm font-medium text-[#1A56DB]">Nutrition</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Food Log</h1>
            <p className="text-sm text-gray-500">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">◀</button>
            <button onClick={() => changeDate(0)} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">
              Today
            </button>
            <button onClick={() => changeDate(1)} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">▶</button>
            <a href="/app/nutrition/add" className="ml-2 rounded-full bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]">
              + Add Food
            </a>
            <a href="/app/nutrition/scan" className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              📷 Scan
            </a>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="mb-6 flex gap-2">
          <a href="/app/nutrition" className="rounded-full bg-[#1A56DB] px-4 py-1.5 text-xs font-medium text-white">Log</a>
          <a href="/app/nutrition/add" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Add</a>
          <a href="/app/nutrition/scan" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Scan</a>
          <a href="/app/nutrition/mealplan" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Meal Plan</a>
        </div>

        {/* Daily Summary */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Daily Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Calories", value: totals.calories, goal: DAILY_GOALS.calories, unit: "kcal", color: "bg-blue-500" },
              { label: "Protein", value: totals.protein, goal: DAILY_GOALS.protein, unit: "g", color: "bg-red-400" },
              { label: "Carbs", value: totals.carbs, goal: DAILY_GOALS.carbs, unit: "g", color: "bg-yellow-400" },
              { label: "Fat", value: totals.fat, goal: DAILY_GOALS.fat, unit: "g", color: "bg-purple-400" },
            ].map((m) => {
              const pct = Math.min(100, Math.round((m.value / m.goal) * 100));
              return (
                <div key={m.label}>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">{m.label}</span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {m.value}<span className="text-xs font-normal text-gray-400">/{m.goal}{m.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meal Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {MEAL_TYPES.map((mt) => {
              const items = groupedLogs[mt] || [];
              const mealCalories = items.reduce((sum: number, l: any) => sum + (l.calories || 0) * (l.servings || 1), 0);
              return (
                <div key={mt} className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50/50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{MEAL_ICONS[mt]}</span>
                      <h3 className="font-semibold text-gray-900">{MEAL_LABELS[mt]}</h3>
                    </div>
                    <span className="text-sm font-medium text-gray-500">{Math.round(mealCalories)} kcal</span>
                  </div>
                  {items.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-400">
                      No foods logged. <a href="/app/nutrition/add" className="text-[#1A56DB] hover:underline">Add food</a>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {items.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.food_name || log.custom_name || "Unknown food"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {log.servings}x serving · P:{Math.round(log.protein * log.servings)}g C:{Math.round(log.carbs * log.servings)}g F:{Math.round(log.fat * log.servings)}g
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">{Math.round(log.calories * log.servings)} kcal</span>
                            <button onClick={() => handleDelete(log.id)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
