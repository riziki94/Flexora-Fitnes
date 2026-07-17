import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  getWeekSchedule,
  addScheduleEntry,
  toggleComplete,
  deleteScheduleEntry,
  getWeekStats,
} from "~/lib/schedule-actions";

export const Route = createFileRoute("/app/schedule/")({
  component: SchedulePage,
});

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

const ACTIVITY_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  workout: { label: "Workout", color: "text-blue-700", bg: "bg-blue-100 border-blue-300" },
  rest: { label: "Rest", color: "text-gray-700", bg: "bg-gray-100 border-gray-300" },
  cardio: { label: "Cardio", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  stretching: { label: "Stretching", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  meal_prep: { label: "Meal Prep", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300" },
  pt_session: { label: "PT Session", color: "text-purple-700", bg: "bg-purple-100 border-purple-300" },
  other: { label: "Other", color: "text-pink-700", bg: "bg-pink-100 border-pink-300" },
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ScheduleEntry {
  id: number;
  user_id: number;
  day_of_week: number;
  week_start_date: string;
  time: string;
  activity_type: string;
  name: string;
  duration_minutes: number;
  completed: number;
  notes: string;
}

function SchedulePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [monday, setMonday] = useState<Date>(getMonday(new Date()));
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDay, setAddDay] = useState(0);
  const [addTime, setAddTime] = useState("08:00");

  // Quick Add form state
  const [quickDay, setQuickDay] = useState(0);
  const [quickTime, setQuickTime] = useState("08:00");
  const [quickType, setQuickType] = useState("workout");
  const [quickName, setQuickName] = useState("");
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickNotes, setQuickNotes] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Modal form state
  const [modalDay, setModalDay] = useState(0);
  const [modalTime, setModalTime] = useState("08:00");
  const [modalType, setModalType] = useState("workout");
  const [modalName, setModalName] = useState("");
  const [modalDuration, setModalDuration] = useState(60);
  const [modalNotes, setModalNotes] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  const loadWeek = useCallback(async (weekStart: string) => {
    setLoading(true);
    try {
      const [sched, st] = await Promise.all([
        getWeekSchedule({ weekStartDate: weekStart }),
        getWeekStats({ weekStartDate: weekStart }),
      ]);
      setEntries(sched as ScheduleEntry[]);
      setStats(st as { total: number; completed: number });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWeek(formatDate(monday));
  }, [monday, loadWeek]);

  const weekStartStr = formatDate(monday);

  function prevWeek() {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    setMonday(d);
  }

  function nextWeek() {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    setMonday(d);
  }

  function currentWeek() {
    setMonday(getMonday(new Date()));
  }

  function openAddModal(day: number, time: string) {
    setModalDay(day);
    setModalTime(time);
    setModalType("workout");
    setModalName("");
    setModalDuration(60);
    setModalNotes("");
    setShowAddModal(true);
  }

  async function handleQuickAdd() {
    if (!quickName.trim()) return;
    setQuickSubmitting(true);
    try {
      await addScheduleEntry({
        dayOfWeek: quickDay,
        weekStartDate: weekStartStr,
        time: quickTime,
        activityType: quickType,
        name: quickName.trim(),
        durationMinutes: quickDuration,
        notes: quickNotes,
      });
      setQuickName("");
      setQuickNotes("");
      await loadWeek(weekStartStr);
    } catch (e) {
      console.error(e);
    }
    setQuickSubmitting(false);
  }

  async function handleModalAdd() {
    if (!modalName.trim()) return;
    setModalSubmitting(true);
    try {
      await addScheduleEntry({
        dayOfWeek: modalDay,
        weekStartDate: weekStartStr,
        time: modalTime,
        activityType: modalType,
        name: modalName.trim(),
        durationMinutes: modalDuration,
        notes: modalNotes,
      });
      setShowAddModal(false);
      await loadWeek(weekStartStr);
    } catch (e) {
      console.error(e);
    }
    setModalSubmitting(false);
  }

  async function handleToggle(id: number) {
    try {
      await toggleComplete({ id });
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, completed: e.completed ? 0 : 1 } : e))
      );
      const st = await getWeekStats({ weekStartDate: weekStartStr });
      setStats(st as { total: number; completed: number });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteScheduleEntry({ id });
      await loadWeek(weekStartStr);
    } catch (e) {
      console.error(e);
    }
  }

  function getEntriesForDaySlot(day: number, hour: number): ScheduleEntry[] {
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    return entries.filter(
      (e) => e.day_of_week === day && e.time === timeStr
    );
  }

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-gray-500">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/profile" className="text-sm text-gray-600 hover:text-[#1A56DB]">Profile</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
            <p className="text-gray-500">Plan your week and track your progress</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={currentWeek} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              Today
            </button>
            <button onClick={prevWeek} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-100 transition-colors">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[180px] text-center">
              {formatDate(monday)} — {formatDate(new Date(monday.getTime() + 6 * 86400000))}
            </span>
            <button onClick={nextWeek} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-100 transition-colors">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Quick Add */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Quick Add Activity</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
              <select value={quickDay} onChange={(e) => setQuickDay(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
              <input type="time" value={quickTime} onChange={(e) => setQuickTime(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={quickType} onChange={(e) => setQuickType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input type="text" value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="e.g. Morning Run" className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
              <input type="number" value={quickDuration} onChange={(e) => setQuickDuration(Number(e.target.value))} min={5} max={480} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-24" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input type="text" value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} placeholder="Optional" className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-32" />
            </div>
            <button
              onClick={handleQuickAdd}
              disabled={quickSubmitting || !quickName.trim()}
              className="rounded-lg bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 transition-colors"
            >
              {quickSubmitting ? "Adding..." : "Add to Schedule"}
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="text-gray-500">Loading schedule...</div></div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                <div className="p-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Time</div>
                {DAY_NAMES.map((d, i) => {
                  const date = new Date(monday.getTime() + i * 86400000);
                  const isToday = formatDate(date) === formatDate(new Date());
                  return (
                    <div key={d} className={`p-3 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? "text-[#1A56DB]" : "text-gray-400"}`}>
                      {d} <span className="block text-[10px] font-normal text-gray-400">{date.getDate()}/{date.getMonth() + 1}</span>
                    </div>
                  );
                })}
              </div>

              {/* Time rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                  <div className="p-2 text-xs text-gray-400 font-medium">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {DAY_NAMES.map((_, dayIdx) => {
                    const slotEntries = getEntriesForDaySlot(dayIdx, hour);
                    return (
                      <div
                        key={dayIdx}
                        className="relative min-h-[50px] cursor-pointer border-l border-gray-100 p-1 hover:bg-blue-50/30 transition-colors"
                        onClick={() => openAddModal(dayIdx, `${String(hour).padStart(2, "0")}:00`)}
                      >
                        {slotEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`mb-1 rounded border px-2 py-1 text-xs ${ACTIVITY_TYPES[entry.activity_type]?.bg || "bg-gray-100 border-gray-300"}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={entry.completed === 1}
                                  onChange={() => handleToggle(entry.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-3.5 w-3.5 rounded accent-[#1A56DB] flex-shrink-0"
                                />
                                <span className={`truncate font-medium ${entry.completed ? "line-through opacity-50" : ""}`}>
                                  {entry.name}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                              <span className={`font-medium ${ACTIVITY_TYPES[entry.activity_type]?.color || ""}`}>
                                {ACTIVITY_TYPES[entry.activity_type]?.label || entry.activity_type}
                              </span>
                              <span>·</span>
                              <span>{entry.duration_minutes}min</span>
                              {entry.notes && <><span>·</span><span className="italic truncate">{entry.notes}</span></>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Tracking */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Weekly Progress</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {stats.completed} of {stats.total} activities completed
                </span>
                <span className="text-sm font-bold text-[#1A56DB]">{progressPct}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1A56DB] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.total - stats.completed}</div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Activity</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                <select value={modalDay} onChange={(e) => setModalDay(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                <input type="time" value={modalTime} onChange={(e) => setModalTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Activity Type</label>
                <select value={modalType} onChange={(e) => setModalType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input type="text" value={modalName} onChange={(e) => setModalName(e.target.value)} placeholder="e.g. Chest & Triceps" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (minutes)</label>
                <input type="number" value={modalDuration} onChange={(e) => setModalDuration(Number(e.target.value))} min={5} max={480} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input type="text" value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} placeholder="Optional" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleModalAdd}
                disabled={modalSubmitting || !modalName.trim()}
                className="rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
              >
                {modalSubmitting ? "Adding..." : "Add Activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
