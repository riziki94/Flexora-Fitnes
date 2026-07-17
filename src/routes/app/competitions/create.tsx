import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createCompetition } from "~/lib/competition-actions";

export const Route = createFileRoute("/app/competitions/create")({
  component: CreateCompetitionPage,
});

const COMPETITION_TYPES = [
  { value: "reps", label: "Most Reps", icon: "🏋️", desc: "Who can complete the most reps in a given exercise" },
  { value: "duration", label: "Longest Duration", icon: "⏱️", desc: "Total workout time across the competition period" },
  { value: "consistency", label: "Most Consistent", icon: "📅", desc: "Most consecutive days with a completed workout" },
  { value: "weight_loss", label: "Weight Loss Challenge", icon: "⚖️", desc: "Highest percentage of body weight lost" },
];

function CreateCompetitionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "reps",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    prize: "",
    countryScope: "global",
    maxParticipants: 0,
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Competition name is required");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("End date must be after start date");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createCompetition({
        name: form.name,
        description: form.description,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        prize: form.prize,
        countryScope: form.countryScope,
        maxParticipants: form.maxParticipants,
      });
      navigate({ to: `/app/competitions/${result.id}` });
    } catch (e: any) {
      setError(e.message || "Failed to create competition");
    } finally {
      setSubmitting(false);
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

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Competition</h1>
          <p className="text-gray-500">Set up a challenge for the community</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Competition Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Summer Shred Challenge"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the competition, rules, and what participants need to do..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              maxLength={500}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Competition Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {COMPETITION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    form.type === t.value
                      ? "border-[#1A56DB] bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>
          </div>

          {/* Prize */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prize</label>
            <input
              type="text"
              value={form.prize}
              onChange={(e) => setForm({ ...form, prize: e.target.value })}
              placeholder="e.g. $100 gift card, Premium membership, Trophy badge"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-400">Sponsor integration coming soon</p>
          </div>

          {/* Country Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country Scope</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                form.countryScope === "global" ? "border-[#1A56DB] bg-blue-50" : "border-gray-200 bg-white"
              }`}>
                <input
                  type="radio"
                  name="countryScope"
                  value="global"
                  checked={form.countryScope === "global"}
                  onChange={(e) => setForm({ ...form, countryScope: e.target.value })}
                  className="text-[#1A56DB]"
                />
                <span className="text-sm font-medium text-gray-900">🌍 Global</span>
              </label>
              <label className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                form.countryScope === "my_country" ? "border-[#1A56DB] bg-blue-50" : "border-gray-200 bg-white"
              }`}>
                <input
                  type="radio"
                  name="countryScope"
                  value="my_country"
                  checked={form.countryScope === "my_country"}
                  onChange={(e) => setForm({ ...form, countryScope: e.target.value })}
                  className="text-[#1A56DB]"
                />
                <span className="text-sm font-medium text-gray-900">🏠 My Country Only</span>
              </label>
            </div>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
            <input
              type="number"
              value={form.maxParticipants || ""}
              onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 0 })}
              placeholder="0 = unlimited"
              min={0}
              className="w-full max-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
            />
            <p className="mt-1 text-xs text-gray-400">Set to 0 for unlimited participants</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/app/competitions" })}
              className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? "Creating..." : "Create Competition"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
