import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  checkAdminAccess,
  getAnalyticsOverview,
  getUserGrowth,
  getRevenueTrend,
  getConversionFunnel,
  getRetentionCohorts,
  getTopPTs,
  getCountryDistribution,
  getRecentActivity,
} from "~/lib/analytics-actions";

export const Route = createFileRoute("/app/admin/analytics")({
  component: AdminAnalyticsPage,
});

// ── Mini SVG chart components ────────────────────────────────────────────

function SparkLine({ data, color = "#3B82F6", width = 60, height = 20 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function LineChart({ data, width = 500, height = 200, color = "#3B82F6" }: {
  data: { label: string; count: number }[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const padding = { top: 15, right: 15, bottom: 30, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.count), 1);

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.count / maxVal) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + chartW},${padding.top + chartH}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding.top + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
              stroke="#374151" strokeWidth="0.5" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end"
              fill="#6B7280" fontSize="9">{Math.round(maxVal * pct)}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={areaPoints} fill={color} fillOpacity="0.1" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      {/* Dots */}
      {data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + chartH - (d.count / maxVal) * chartH;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
      {/* X labels */}
      {data.filter((_, i) => i % 2 === 0 || data.length <= 6).map((d, i) => {
        const idx = data.length <= 6 ? i : i * 2;
        const x = padding.left + (idx / (data.length - 1)) * chartW;
        return (
          <text key={i} x={x} y={height - 5} textAnchor="middle" fill="#9CA3AF" fontSize="9">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function BarChart({ data, width = 500, height = 200, color = "#3B82F6", barKey = "count" as string }: {
  data: any[];
  width?: number;
  height?: number;
  color?: string;
  barKey?: string;
}) {
  if (!data.length) return null;
  const padding = { top: 15, right: 15, bottom: 30, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map((d: any) => typeof d[barKey] === "number" ? d[barKey] : d.count), 1);
  const barWidth = Math.max(4, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding.top + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
              stroke="#374151" strokeWidth="0.5" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end"
              fill="#6B7280" fontSize="9">{Math.round(maxVal * pct)}</text>
          </g>
        );
      })}
      {data.map((d: any, i: number) => {
        const val = typeof d[barKey] === "number" ? d[barKey] : d.count;
        const barH = (val / maxVal) * chartH;
        const x = padding.left + i * gap + (gap - barWidth) / 2;
        const y = padding.top + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx="2" opacity="0.85" />
            <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fill="#9CA3AF" fontSize="8">
              {d.label || d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalBarChart({ data, width = 500, height = 160, color = "#3B82F6" }: {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barH = Math.min(28, (height - 20) / data.length - 8);
  const totalH = data.length * (barH + 8) + 10;

  return (
    <svg viewBox={`0 0 ${width} ${totalH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const w = (d.value / maxVal) * (width - 80);
        const y = 10 + i * (barH + 8);
        return (
          <g key={i}>
            <text x={0} y={y + barH / 2 + 4} fill="#D1D5DB" fontSize="11" fontWeight="600">
              {d.label}
            </text>
            <rect x={75} y={y} width={w} height={barH} fill={color} rx="3" opacity="0.85" />
            <text x={80 + w} y={y + barH / 2 + 4} fill="#9CA3AF" fontSize="10">
              {d.value.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data, width = 200, height = 200, colors }: {
  data: { name: string; value: number }[];
  width?: number;
  height?: number;
  colors: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(cx, cy) - 5;
  const innerR = outerR * 0.6;
  let angle = -Math.PI / 2;

  function polarToCartesian(cx: number, cy: number, r: number, a: number) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(startAngle: number, endAngle: number) {
    const s = polarToCartesian(cx, cy, outerR, endAngle);
    const e = polarToCartesian(cx, cy, outerR, startAngle);
    const si = polarToCartesian(cx, cy, innerR, endAngle);
    const ei = polarToCartesian(cx, cy, innerR, startAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 ${large} 0 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${innerR} ${innerR} 0 ${large} 1 ${si.x} ${si.y} Z`;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const sliceAngle = (d.value / total) * 2 * Math.PI;
        const startAngle = angle;
        const endAngle = angle + sliceAngle;
        angle = endAngle;
        return (
          <g key={i}>
            <path d={arcPath(startAngle, endAngle)} fill={colors[i % colors.length]} opacity="0.85" />
            {d.value / total > 0.05 && (
              <text
                x={polarToCartesian(cx, cy, outerR + 12, startAngle + sliceAngle / 2).x}
                y={polarToCartesian(cx, cy, outerR + 12, startAngle + sliceAngle / 2).y}
                fill="#D1D5DB" fontSize="9" textAnchor="middle"
              >
                {d.name} ({Math.round((d.value / total) * 100)}%)
              </text>
            )}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={innerR} fill="#1F2937" />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#F9FAFB" fontSize="16" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#9CA3AF" fontSize="9">users</text>
    </svg>
  );
}

function RetentionChart({ averages, width = 500, height = 180 }: {
  averages: number[];
  width?: number;
  height?: number;
}) {
  const padding = { top: 15, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = Math.max(30, (chartW / averages.length) * 0.5);
  const gap = chartW / averages.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 25, 50, 75, 100].map(pct => {
        const y = padding.top + chartH - (pct / 100) * chartH;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
              stroke="#374151" strokeWidth="0.5" />
            <text x={padding.left - 5} y={y + 4} textAnchor="end" fill="#6B7280" fontSize="9">
              {pct}%
            </text>
          </g>
        );
      })}
      {averages.map((v, i) => {
        const barH = (v / 100) * chartH;
        const x = padding.left + i * gap + (gap - barWidth) / 2;
        const y = padding.top + chartH - barH;
        const color = v > 60 ? "#10B981" : v > 30 ? "#F59E0B" : "#EF4444";
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx="3" opacity="0.85" />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#D1D5DB" fontSize="12" fontWeight="600">
              {v}%
            </text>
            <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fill="#9CA3AF" fontSize="10">
              Wk {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────

const DONUT_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // KPI data
  const [overview, setOverview] = useState<any>(null);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);
  const [retention, setRetention] = useState<{ cohorts: number; averages: number[] }>({ cohorts: 0, averages: [] });
  const [topPTs, setTopPTs] = useState<any[]>([]);
  const [countryDist, setCountryDist] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }

    async function loadAll() {
      try {
        // Check admin access first
        await checkAdminAccess();
        setIsAdmin(true);

        const [ov, ug, rt, cf, ret, pt, cd, af] = await Promise.all([
          getAnalyticsOverview(),
          getUserGrowth(),
          getRevenueTrend(),
          getConversionFunnel(),
          getRetentionCohorts(),
          getTopPTs(),
          getCountryDistribution(),
          getRecentActivity(),
        ]);

        setOverview(ov);
        setUserGrowth(ug);
        setRevenueTrend(rt);
        setConversionFunnel(cf);
        setRetention(ret);
        setTopPTs(pt);
        setCountryDist(cd);
        setActivityFeed(af);
      } catch (err: any) {
        if (err.message?.includes("Admin")) {
          setError("Access denied. Admin privileges required.");
        } else {
          setError(err.message || "Failed to load analytics");
        }
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center max-w-md p-8">
          <div className="text-red-400 text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => { localStorage.removeItem("flexora_token"); localStorage.removeItem("flexora_user"); navigate({ to: "/login" }); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = overview ? [
    { label: "Total Users", value: overview.totalUsers.value.toLocaleString(), change: overview.totalUsers.change, color: "#3B82F6" },
    { label: "Active This Month", value: overview.activeThisMonth.value.toLocaleString(), change: overview.activeThisMonth.change, color: "#10B981" },
    { label: "New Signups (Week)", value: overview.newThisWeek.value.toLocaleString(), change: overview.newThisWeek.change, color: "#8B5CF6" },
    { label: "Verified PTs", value: overview.verifiedPTs.value.toLocaleString(), change: overview.verifiedPTs.change, color: "#F59E0B" },
    { label: "Booked Sessions", value: overview.bookedSessions.value.toLocaleString(), change: overview.bookedSessions.change, color: "#EC4899" },
    { label: "Revenue (kr)", value: `kr ${overview.revenue.value.toLocaleString()}`, change: overview.revenue.change, color: "#06B6D4" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-400">Flexora</span>
            <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full border border-blue-700/50">
              Admin Analytics
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => navigate({ to: "/app/dashboard" })}
              className="text-gray-400 hover:text-white transition-colors">
              ← Dashboard
            </button>
            <span className="text-gray-600">|</span>
            <button onClick={() => { localStorage.removeItem("flexora_token"); localStorage.removeItem("flexora_user"); navigate({ to: "/login" }); }}
              className="text-gray-400 hover:text-red-400 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Investor Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time platform analytics. All data from live database.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((card, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-semibold ${card.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {card.change >= 0 ? "↑" : "↓"} {Math.abs(card.change)}%
                </span>
                <span className="text-gray-600 text-xs">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* User Growth — Line Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              📈 User Growth — New Users per Week
            </h3>
            <LineChart data={userGrowth} color="#3B82F6" />
          </div>

          {/* Revenue Trend — Bar Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              💰 Monthly Revenue (kr)
            </h3>
            <div className="flex gap-2 mb-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Subscriptions
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Bookings
              </span>
            </div>
            <svg viewBox="0 0 500 200" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              {(() => {
                if (!revenueTrend.length) return null;
                const pad = { top: 15, right: 15, bottom: 30, left: 50 };
                const cw = 500 - pad.left - pad.right;
                const ch = 200 - pad.top - pad.bottom;
                const maxVal = Math.max(...revenueTrend.map((d: any) => d.subscriptions + d.bookings), 1);
                const barW = Math.max(8, (cw / revenueTrend.length) * 0.35);
                const gap = cw / revenueTrend.length;
                return (
                  <>
                    {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                      const y = pad.top + ch - pct * ch;
                      return (
                        <g key={pct}>
                          <line x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="#374151" strokeWidth="0.5" />
                          <text x={pad.left - 5} y={y + 4} textAnchor="end" fill="#6B7280" fontSize="9">
                            {Math.round(maxVal * pct)}
                          </text>
                        </g>
                      );
                    })}
                    {revenueTrend.map((d: any, i: number) => {
                      const x = pad.left + i * gap + (gap - barW * 2 - 2) / 2;
                      const subH = (d.subscriptions / maxVal) * ch;
                      const bookH = (d.bookings / maxVal) * ch;
                      return (
                        <g key={i}>
                          <rect x={x} y={pad.top + ch - subH} width={barW} height={subH} fill="#3B82F6" rx="2" />
                          <rect x={x + barW + 2} y={pad.top + ch - bookH} width={barW} height={bookH} fill="#10B981" rx="2" />
                          <text x={x + barW + 1} y={200 - 5} textAnchor="middle" fill="#9CA3AF" fontSize="9">{d.label}</text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              🔻 Conversion Funnel
            </h3>
            <HorizontalBarChart data={conversionFunnel} color="#8B5CF6" />
          </div>

          {/* Retention Cohorts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              🔄 Weekly Retention ({retention.cohorts} user cohort)
            </h3>
            <RetentionChart averages={retention.averages} />
          </div>

          {/* Top PTs */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              ⭐ Top 10 PTs by Satisfaction %
            </h3>
            {topPTs.length > 0 ? (
              <BarChart
                data={topPTs.map((pt: any) => ({ ...pt, count: pt.satisfaction }))}
                color="#F59E0B"
                barKey="count"
              />
            ) : (
              <p className="text-gray-600 text-sm py-8 text-center">No PT ratings data yet.</p>
            )}
          </div>

          {/* Country Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              🌍 Users by Country
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-48 h-48 flex-shrink-0">
                <DonutChart data={countryDist} colors={DONUT_COLORS} width={200} height={200} />
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {countryDist.slice(0, 8).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-gray-300 truncate">{c.name}</span>
                    <span className="text-gray-500 ml-auto">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            🟢 Live Activity Feed
          </h3>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <p className="text-gray-600 text-sm py-4 text-center">No activity recorded yet.</p>
            ) : (
              activityFeed.map((event: any, i: number) => {
                const typeColor: Record<string, string> = {
                  signup: "text-blue-400",
                  booking: "text-purple-400",
                  payment: "text-emerald-400",
                  session_completed: "text-amber-400",
                  subscription: "text-cyan-400",
                  pt_verified: "text-pink-400",
                };
                const typeIcon: Record<string, string> = {
                  signup: "👤",
                  booking: "📅",
                  payment: "💳",
                  session_completed: "🏋️",
                  subscription: "⭐",
                  pt_verified: "✅",
                };
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(event.time).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  const hours = Math.floor(mins / 60);
                  if (hours < 24) return `${hours}h ago`;
                  return `${Math.floor(hours / 24)}d ago`;
                })();

                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-colors text-sm">
                    <span className="text-base flex-shrink-0">{typeIcon[event.type] || "•"}</span>
                    <span className="flex-1 text-gray-300 truncate">{event.description}</span>
                    <span className={`text-xs font-medium ${typeColor[event.type] || "text-gray-500"}`}>
                      {event.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{timeAgo}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-700 py-4 border-t border-gray-800">
          Flexora Fitnes — Investor Dashboard • Data refreshes on page load • All figures estimated from live DB
        </div>
      </main>
    </div>
  );
}
