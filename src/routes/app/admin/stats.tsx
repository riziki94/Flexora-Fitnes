import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getStatsOverview, getRecentVisits, type StatsOverview, type RecentVisit } from "~/lib/stats-actions";

export const Route = createFileRoute("/app/admin/stats")({
  component: AdminStatsPage,
});

function AdminStatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [recent, setRecent] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [o, r] = await Promise.all([getStatsOverview(), getRecentVisits()]);
        setOverview(o);
        setRecent(r);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading stats…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/app/admin/analytics" className="text-sm text-blue-600 hover:underline">
              ← Analytics
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Stats Dashboard</h1>
          </div>
          <Link
            to="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Total Page Views</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {overview?.totalPageViews ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Unique Visitors Today</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {overview?.uniqueToday ?? 0}
            </p>
          </div>
        </div>

        {/* Views Per Day Chart (last 7 days) */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Page Views — Last 7 Days
          </h2>
          {overview?.viewsPerDay && overview.viewsPerDay.length > 0 ? (
            <BarChart data={overview.viewsPerDay} />
          ) : (
            <p className="text-sm text-gray-400">No data yet.</p>
          )}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Top Pages */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Most Visited Pages
            </h2>
            {overview?.topPages && overview.topPages.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Path</th>
                    <th className="pb-2 text-right font-medium">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topPages.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-xs text-gray-700">{p.path}</td>
                      <td className="py-2 text-right tabular-nums text-gray-900">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No data yet.</p>
            )}
          </div>

          {/* Event type breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Event Types
            </h2>
            {overview ? (
              <EventTypeBreakdown />
            ) : (
              <p className="text-sm text-gray-400">No data yet.</p>
            )}
          </div>
        </div>

        {/* Recent Visits Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Visits (Last 50)
          </h2>
          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Event</th>
                    <th className="pb-2 font-medium">Path</th>
                    <th className="pb-2 font-medium">User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50">
                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-gray-500">
                        {v.created_at}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${eventBadge(v.event_type)}`}>
                          {v.event_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                        {v.path || "—"}
                      </td>
                      <td className="max-w-xs truncate py-2 text-xs text-gray-400" title={v.user_agent}>
                        {v.user_agent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No visits recorded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

/** Simple horizontal bar chart */
function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500">
            {d.date.slice(5)} {/* MM-DD */}
          </span>
          <div className="flex-1">
            <div
              className="h-6 rounded bg-blue-500 transition-all"
              style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count > 0 ? "2px" : "0" }}
            />
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-gray-700">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Lazy event type breakdown */
function EventTypeBreakdown() {
  const [types, setTypes] = useState<{ event_type: string; count: number }[]>([]);

  useEffect(() => {
    // We load from the same source — just run inline query via a simple server function call.
    // For simplicity, we re-use the overview data structure.
    import("~/lib/stats-actions").then((m) => {
      m.getRecentVisits().then((visits) => {
        const counts: Record<string, number> = {};
        for (const v of visits) {
          counts[v.event_type] = (counts[v.event_type] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .map(([event_type, count]) => ({ event_type, count }))
          .sort((a, b) => b.count - a.count);
        setTypes(sorted);
      });
    });
  }, []);

  if (types.length === 0) return <p className="text-sm text-gray-400">No data yet.</p>;

  return (
    <div className="space-y-2">
      {types.map((t, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${eventBadge(t.event_type)}`}>
            {t.event_type}
          </span>
          <span className="text-sm tabular-nums text-gray-700">{t.count}</span>
        </div>
      ))}
    </div>
  );
}

function eventBadge(type: string): string {
  switch (type) {
    case "pageview":
      return "bg-blue-100 text-blue-700";
    case "blog_view":
      return "bg-purple-100 text-purple-700";
    case "signup_started":
      return "bg-yellow-100 text-yellow-700";
    case "signup_completed":
      return "bg-green-100 text-green-700";
    case "pt_signup":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
