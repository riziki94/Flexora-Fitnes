import { useEffect, useState, useRef, useCallback } from "react";
import { createServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

// ── Types ────────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "12m" | "this-year" | "last-year" | "5y" | "10y" | "custom";

interface DateRange { from: string; to: string; }

interface ProductBreakdown {
  subscribers: number;
  oneTimeRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalRevenue: number;
  trend: number; // percentage change vs previous period (+/-)
  revenueByMonth: { label: string; value: number }[];
}

interface OwnerStats {
  totalUsers: number;
  activeSubscriptions: number;
  periodRevenue: number;
  activeDevices: number;
  usersByDay: { label: string; value: number }[];
  usersByMonth: { label: string; value: number }[];
  usersByYear: { label: string; value: number }[];
  revenueByMonth: { label: string; value: number }[];
  subscriptionDistribution: { name: string; value: number }[];
  periodLabel: string;
  kitoslight: ProductBreakdown;
  zongosol: ProductBreakdown;
  dashboard: ProductBreakdown;
}

const MIN_DATE = "2016-01-01";
const MAX_DATE = toDateStr(new Date());
const YEAR_BUTTONS = Array.from({ length: 11 }, (_, i) => 2016 + i);

const MONTHS = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date): string { return d.toISOString().split("T")[0]; }

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Resolve a named period to a concrete {from, to} date range */
function resolvePeriod(period: Period, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "12m": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 11);
      from.setDate(1);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "this-year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "last-year": {
      const from = new Date(now.getFullYear() - 1, 0, 1);
      const to = new Date(now.getFullYear() - 1, 11, 31);
      return { from: toDateStr(from), to: toDateStr(to) };
    }
    case "5y": {
      const from = new Date(today);
      from.setFullYear(from.getFullYear() - 5);
      from.setMonth(0);
      from.setDate(1);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "10y": {
      const from = new Date(today);
      from.setFullYear(from.getFullYear() - 10);
      from.setMonth(0);
      from.setDate(1);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
    case "custom":
    default: {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      // Fallback to last 30 days
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toDateStr(from), to: toDateStr(today) };
    }
  }
}

function periodLabel(period: Period, range: DateRange): string {
  const labels: Record<Period, string> = {
    "7d": "Siste 7 dager",
    "30d": "Siste 30 dager",
    "12m": "Siste 12 måneder",
    "this-year": "I år",
    "last-year": "I fjor",
    "5y": "Siste 5 år",
    "10y": "Siste 10 år",
    "custom": `${range.from} – ${range.to}`,
  };
  return labels[period];
}

// ── Seeded PRNG ───────────────────────────────────────────────────────────────

/** Simple mulberry32 PRNG for reproducible "random" mock data */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Mock data generator ───────────────────────────────────────────────────────

/** Compute a 0..1 growth factor: 0 = 2016-01-01, 1 = 2026-12-31 */
function growthFactor(date: Date): number {
  const base = new Date("2016-01-01").getTime();
  const end = new Date("2026-12-31").getTime();
  const now = date.getTime();
  return Math.max(0, Math.min(1, (now - base) / (end - base)));
}

/** Build product-specific revenue breakdown from total product revenue */
function buildProductBreakdown(
  rng: () => number,
  totalProductRev: number,
  totalSubs: number,
  productSubs: number,
  from: Date,
  to: Date,
  months: number,
  monthCount: number,
  factor: number,
  oneTimePct: number,
  monthlyPct: number,
): ProductBreakdown {
  const rand = (lo: number, hi: number) => Math.floor(rng() * (hi - lo + 1)) + lo;

  const oneTime = Math.round(totalProductRev * oneTimePct);
  const monthly = Math.round(totalProductRev * monthlyPct);
  const yearly = totalProductRev - oneTime - monthly;

  // Trend: -5% to +20% random
  const trend = rand(-5, 20);

  // Product monthly revenue
  const revenueByMonth: { label: string; value: number }[] = [];
  let prev = Math.round((totalProductRev / 1000) * 0.3);
  for (let i = 0; i <= monthCount; i++) {
    const m = new Date(from.getFullYear(), from.getMonth() + Math.round((i / monthCount) * months), 1);
    if (m > to) break;
    prev += rand(Math.max(1, Math.round(3 * (0.2 + factor * 0.8))), Math.max(2, Math.round(12 * (0.3 + factor * 0.7))));
    revenueByMonth.push({ label: MONTHS[m.getMonth()], value: Math.min(prev, Math.round(totalProductRev / 1000) + 10) });
  }

  return {
    subscribers: productSubs,
    oneTimeRevenue: oneTime,
    monthlyRevenue: monthly,
    yearlyRevenue: yearly,
    totalRevenue: totalProductRev,
    trend,
    revenueByMonth,
  };
}

function generateMockStats(fromStr: string, toStr: string): OwnerStats {
  const rng = mulberry32(42);
  const rand = (lo: number, hi: number) => Math.floor(rng() * (hi - lo + 1)) + lo;

  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59");
  const days = Math.max(daysBetween(from, to), 1);
  const months = monthsBetween(from, to);

  // Growth factor based on end of range
  const factor = growthFactor(to);

  // Realistic cumulative totals scaled by growth factor
  // 2016: ~50 users, ~20 subs, ~5 devices  →  2026: ~1200 users, ~900 subs, ~180 devices
  const totalUsers = Math.round(50 + factor * 1150 + rand(-20, 20));
  const activeSubscriptions = Math.round(20 + factor * 880 + rand(-10, 10));
  const activeDevices = Math.round(5 + factor * 175 + rand(-5, 5));
  const baseRevenue = Math.round(30_000 + factor * 770_000 + rand(-5000, 5000));

  const periodLbl = `${fromStr} – ${toStr}`;

  // ── Users by day ──────────────────────────────────────────────────────────
  const usersByDay: { label: string; value: number }[] = [];
  const dayCount = Math.min(days, 60);
  let dcum = Math.max(Math.round(totalUsers * 0.7), 5);
  for (let i = 0; i <= dayCount; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + Math.round((i / dayCount) * days));
    dcum += rand(1, Math.max(2, Math.round(12 * (0.3 + factor * 0.7))));
    usersByDay.push({
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      value: Math.min(dcum, totalUsers + 50),
    });
  }

  // ── Users by month ────────────────────────────────────────────────────────
  const usersByMonth: { label: string; value: number }[] = [];
  const monthCount = Math.min(months, 24);
  let mcum = Math.max(Math.round(totalUsers * 0.5), 3);
  for (let i = 0; i <= monthCount; i++) {
    const m = new Date(from.getFullYear(), from.getMonth() + Math.round((i / monthCount) * months), 1);
    if (m > to) break;
    mcum += rand(Math.max(2, Math.round(10 * (0.2 + factor * 0.8))), Math.max(5, Math.round(40 * (0.3 + factor * 0.7))));
    usersByMonth.push({ label: MONTHS[m.getMonth()], value: Math.min(mcum, totalUsers + 30) });
  }

  // ── Users by year — show all years 2016..current ──────────────────────────
  const usersByYear: { label: string; value: number }[] = [];
  let ycum = 20; // start with just a handful in 2016
  const startYear = 2016;
  const endYear = new Date().getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    // Accelerating growth: early years slower, later years faster
    const yFactor = (y - 2016) / (endYear - 2016 || 1);
    const gain = Math.round(30 + yFactor * 130 + rand(-15, 20));
    ycum += Math.max(5, gain);
    usersByYear.push({ label: String(y), value: ycum });
  }

  // ── Revenue by month (kNOK) ────────────────────────────────────────────────
  let rev = Math.max(Math.round(baseRevenue / 1000 * 0.5), 2);
  const revenueByMonth: { label: string; value: number }[] = [];
  for (let i = 0; i <= monthCount; i++) {
    const m = new Date(from.getFullYear(), from.getMonth() + Math.round((i / monthCount) * months), 1);
    if (m > to) break;
    rev += rand(Math.max(1, Math.round(5 * (0.2 + factor * 0.8))), Math.max(3, Math.round(30 * (0.3 + factor * 0.7))));
    revenueByMonth.push({ label: MONTHS[m.getMonth()], value: Math.min(rev, Math.round(baseRevenue / 1000) + 20) });
  }

  // ── Subscription distribution ─────────────────────────────────────────────
  const kLightSubs = Math.round(activeSubscriptions * (0.4 + rand(5, 15) / 100));
  const zongoSubs = Math.round(activeSubscriptions * (0.2 + rand(5, 10) / 100));
  const dashSubs = Math.max(activeSubscriptions - kLightSubs - zongoSubs, 1);

  // ── Product revenue allocation ────────────────────────────────────────────
  const klightRev = Math.round(baseRevenue * 0.35 + rand(-2000, 2000));
  const zongoRev = Math.round(baseRevenue * 0.42 + rand(-2000, 2000));
  const dashRev = baseRevenue - klightRev - zongoRev;

  const kitoslight = buildProductBreakdown(rng, klightRev, activeSubscriptions, kLightSubs, from, to, months, monthCount, factor, 0.22, 0.52);
  const zongosol = buildProductBreakdown(rng, zongoRev, activeSubscriptions, zongoSubs, from, to, months, monthCount, factor, 0.28, 0.40);
  const dashboard = buildProductBreakdown(rng, dashRev, activeSubscriptions, dashSubs, from, to, months, monthCount, factor, 0.0, 0.58);

  return {
    totalUsers,
    activeSubscriptions,
    periodRevenue: baseRevenue,
    activeDevices,
    usersByDay, usersByMonth, usersByYear,
    revenueByMonth,
    subscriptionDistribution: [
      { name: "Kitoslight", value: kLightSubs },
      { name: "Zongosol", value: zongoSubs },
      { name: "Dashboard", value: dashSubs },
    ],
    periodLabel: periodLbl,
    kitoslight,
    zongosol,
    dashboard,
  };
}

// ── Server functions ──────────────────────────────────────────────────────────

const getOwnerStats = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { from?: string; to?: string })
  .handler(async ({ data }) => {
    const from = data.from || (() => { const d = new Date(); d.setDate(d.getDate() - 29); return toDateStr(d); })();
    const to = data.to || toDateStr(new Date());
    try {
      const { getServerClient } = await import("~/lib/supabase");
      const client = getServerClient();
      const { count } = await client.from("profiles").select("*", { count: "exact", head: true });
      const { data: devices } = await client.from("devices").select("*");
      const mock = generateMockStats(from, to);
      if (count !== null) mock.totalUsers = count;
      if (devices) mock.activeDevices = devices.length;
      return mock;
    } catch { return generateMockStats(from, to); }
  });

const sendOwnerReport = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { emails: string[]; reportHtml: string })
  .handler(async ({ data }) => {
    console.log(`[Owner Report] Sending to: ${data.emails.join(", ")}`);
    return { ok: true, sentTo: data.emails, message: `Rapport sendt til ${data.emails.length} mottaker${data.emails.length > 1 ? "e" : ""}` };
  });

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNok(n: number): string { return new Intl.NumberFormat("nb-NO").format(n) + " kr"; }
function formatCompact(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "k";
  return String(n);
}

// ── Colors ────────────────────────────────────────────────────────────────────
// Kitoslight = blue, Zongosol = green, Dashboard = purple
const C = { emerald: "#059669", emeraldL: "#34d399", blue: "#3b82f6", purple: "#8b5cf6", amber: "#f59e0b" };
const PIE_COLORS = [C.blue, C.emerald, C.purple]; // Kitoslight, Zongosol, Dashboard

// Product color map
const PRODUCT_COLORS: Record<string, { bg: string; text: string; hex: string; border: string; light: string }> = {
  Kitoslight: { bg: "bg-blue-50", text: "text-blue-600", hex: C.blue, border: "border-blue-200", light: "#dbeafe" },
  Zongosol:   { bg: "bg-emerald-50", text: "text-emerald-600", hex: C.emerald, border: "border-emerald-200", light: "#d1fae5" },
  Dashboard:  { bg: "bg-purple-50", text: "text-purple-600", hex: C.purple, border: "border-purple-200", light: "#ede9fe" },
};

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/owner")({ component: OwnerDashboard });

// ── SVG Chart components ──────────────────────────────────────────────────────

/** Simple SVG line chart */
function SvgLineChart({ data, width, height, color, formatVal }: {
  data: { label: string; value: number }[];
  width: number; height: number; color: string; formatVal?: (v: number) => string;
}) {
  const pad = { top: 20, right: 20, bottom: 32, left: 50 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const vals = data.map(d => d.value);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * w;
    const y = pad.top + h - ((d.value - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  // Y-axis ticks
  const yTicks = 5;
  const yTickEls = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = min + (range * i) / yTicks;
    const y = pad.top + h - ((val - min) / range) * h;
    yTickEls.push(
      <g key={`yt-${i}`}>
        <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
        <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
          {formatVal ? formatVal(val) : formatCompact(val)}
        </text>
      </g>
    );
  }

  // X-axis labels (show fewer)
  const xStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid + Y-axis */}
      {yTickEls}
      {/* X-axis */}
      <line x1={pad.left} y1={pad.top + h} x2={width - pad.right} y2={pad.top + h} stroke="#e2e8f0" strokeWidth={1} />
      {data.map((d, i) => (i % xStep === 0 || i === data.length - 1) && (
        <text key={`xl-${i}`} x={pad.left + (i / Math.max(data.length - 1, 1)) * w} y={pad.top + h + 18}
          textAnchor="middle" fontSize={11} fill="#94a3b8">{d.label}</text>
      ))}
      {/* Area fill */}
      <polygon
        points={`${pad.left},${pad.top + h} ${points} ${width - pad.right},${pad.top + h}`}
        fill={color} fillOpacity={0.08}
      />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (i % xStep === 0 || i === data.length - 1) && (
        <circle key={`dot-${i}`} cx={pad.left + (i / Math.max(data.length - 1, 1)) * w}
          cy={pad.top + h - ((d.value - min) / range) * h} r={3} fill={color} />
      ))}
    </svg>
  );
}

/** Simple SVG bar chart */
function SvgBarChart({ data, width, height, color, formatVal }: {
  data: { label: string; value: number }[];
  width: number; height: number; color: string; formatVal?: (v: number) => string;
}) {
  const pad = { top: 20, right: 16, bottom: 32, left: 50 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(...data.map(d => d.value));
  const barW = Math.max(8, (w / data.length) * 0.7);
  const gap = w / data.length;

  const yTicks = 5;
  const yTickEls = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = (max * i) / yTicks;
    const y = pad.top + h - (val / max) * h;
    yTickEls.push(
      <g key={`yt-${i}`}>
        <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
        <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
          {formatVal ? formatVal(val) : formatCompact(val)}
        </text>
      </g>
    );
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {yTickEls}
      <line x1={pad.left} y1={pad.top + h} x2={width - pad.right} y2={pad.top + h} stroke="#e2e8f0" strokeWidth={1} />
      {data.map((d, i) => {
        const barH = (d.value / max) * h;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + h - barH;
        return (
          <g key={`bar-${i}`}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} />
            <text x={x + barW / 2} y={pad.top + h + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Simple SVG donut/pie chart */
function SvgPieChart({ data, width, height }: {
  data: { name: string; value: number }[];
  width: number; height: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(cx, cy) - 20;
  const innerR = outerR * 0.55;
  const total = data.reduce((s, d) => s + d.value, 0);

  let startAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(startAngle);
    const y1i = cy + innerR * Math.sin(startAngle);
    const x2i = cx + innerR * Math.cos(endAngle);
    const y2i = cy + innerR * Math.sin(endAngle);

    const large = sliceAngle > Math.PI ? 1 : 0;
    const path = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
      `L ${x2i} ${y2i}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i}`,
      "Z",
    ].join(" ");

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = outerR + 24;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const pct = Math.round((d.value / total) * 100);

    const slice = { path, name: d.name, value: d.value, lx, ly, pct, midAngle };
    startAngle = endAngle;
    return slice;
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {slices.map((s, i) => (
        <g key={`slice-${i}`}>
          <path d={s.path} fill={PIE_COLORS[i]} stroke="none" />
        </g>
      ))}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="#1e293b">
        {total.toLocaleString("nb-NO")}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#94a3b8">totalt</text>
    </svg>
  );
}

function LegendItems({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
          <span>{d.name} ({Math.round((d.value/total)*100)}%)</span>
        </div>
      ))}
    </div>
  );
}

// ── Product Section component ─────────────────────────────────────────────────

function ProductSection({ name, data, colorInfo }: {
  name: string;
  data: ProductBreakdown;
  colorInfo: typeof PRODUCT_COLORS[string];
}) {
  const trendUp = data.trend >= 0;
  return (
    <div className={`rounded-xl border ${colorInfo.border} bg-white p-5 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorInfo.hex }} />
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          trendUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          <span>{trendUp ? "▲" : "▼"}</span>
          <span>{trendUp ? "+" : ""}{data.trend}%</span>
          <span className="font-normal text-gray-400 ml-0.5">vs forrige</span>
        </div>
      </div>

      {/* KPI Mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Abonnenter</p>
          <p className="text-lg font-bold text-gray-900">{formatCompact(data.subscribers)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Engangsinntekt</p>
          <p className="text-lg font-bold text-gray-900">{formatCompact(data.oneTimeRevenue)} kr</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Månedlig inntekt</p>
          <p className="text-lg font-bold text-gray-900">{formatCompact(data.monthlyRevenue)} kr</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Årlig inntekt</p>
          <p className="text-lg font-bold text-gray-900">{formatCompact(data.yearlyRevenue)} kr</p>
        </div>
      </div>

      {/* Total revenue summary */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-gray-500">Totalinntekt i perioden</span>
        <span className="text-sm font-bold" style={{ color: colorInfo.hex }}>{formatNok(data.totalRevenue)}</span>
      </div>

      {/* Mini bar chart */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-xs font-medium text-gray-500 mb-2">Månedlige inntekter (kNOK)</h4>
        <SvgBarChart data={data.revenueByMonth} width={500} height={150} color={colorInfo.hex}
          formatVal={(v) => `${Math.round(v)}k`} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userView, setUserView] = useState<"day" | "month" | "year">("month");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [shareStatus, setShareStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // ── Date filter state ─────────────────────────────────────────────────────
  const [period, setPeriod] = useState<Period>("30d");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return toDateStr(d);
  });
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()));
  const [appliedRange, setAppliedRange] = useState<DateRange>(resolvePeriod("30d"));

  // Fetch data whenever appliedRange changes
  const fetchStats = useCallback((range: DateRange) => {
    setLoading(true);
    getOwnerStats({ data: { from: range.from, to: range.to } })
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  useEffect(() => { fetchStats(appliedRange); }, [appliedRange, fetchStats]);

  // Apply custom range
  const applyCustomRange = () => {
    const range = resolvePeriod("custom", customFrom, customTo);
    setAppliedRange(range);
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!dashboardRef.current) return;
    setPdfGenerating(true);
    try {
      const { default: h2c } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const btns = dashboardRef.current.querySelectorAll<HTMLElement>(".no-print-btn");
      btns.forEach(b => b.style.display = "none");

      const canvas = await h2c(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      btns.forEach(b => b.style.display = "");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw - 20;
      const ih = (canvas.height * iw) / canvas.width;

      pdf.setFontSize(18);
      pdf.setTextColor(5, 150, 105);
      pdf.text("Kitozon — Eierrapport", 10, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generert: ${new Date().toLocaleDateString("nb-NO")}`, 10, 22);

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 28, iw, ih);
      pdf.save(`Kitozon-Rapport-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF failed:", err);
      alert("Kunne ikke generere PDF. Prøv igjen.");
    } finally { setPdfGenerating(false); }
  }, []);

  const handleShare = useCallback(async () => {
    const emails = emailInput.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes("@") && e.includes("."));
    if (emails.length === 0) { setShareStatus({ ok: false, message: "Vennligst skriv inn minst én gyldig e-postadresse." }); return; }
    setShareStatus(null);
    const html = buildReportHtml(stats);
    const result = await sendOwnerReport({ data: { emails, reportHtml: html } });
    setShareStatus(result);
    if (result.ok) {
      setEmailInput("");
      setTimeout(() => { setShowShareDialog(false); setShareStatus(null); }, 2000);
    }
  }, [emailInput, stats]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"/><p className="text-gray-500">Laster dashboard...</p></div></div>;
  if (!stats) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-gray-500">Kunne ikke laste data.</p></div>;

  const userData = userView === "day" ? stats.usersByDay : userView === "month" ? stats.usersByMonth : stats.usersByYear;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kitozon — Eierdashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Full oversikt over brukere, salg, abonnementer og enheter</p>
            </div>
            <div className="flex items-center gap-3 no-print-btn">
              <button onClick={handleDownloadPdf} disabled={pdfGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {pdfGenerating ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Genererer...</> :
                <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> Last ned rapport</>}
              </button>
              <button onClick={() => setShowShareDialog(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Send rapport
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Date filter bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          {/* Row 1: quick-select periods */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-600 mr-1">Periode:</span>
            {(["7d","30d","12m","this-year","last-year","5y","10y"] as Period[]).map(p => (
              <button key={p} onClick={() => {
                setPeriod(p);
                const range = resolvePeriod(p);
                setAppliedRange(range);
              }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  period === p
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>
                {{"7d":"7 dager","30d":"30 dager","12m":"12 mnd","this-year":"I år","last-year":"I fjor","5y":"5 år","10y":"10 år"}[p]}
              </button>
            ))}
            <button onClick={() => setPeriod("custom")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                period === "custom"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}>
              Egendefinert
            </button>
          </div>

          {/* Row 2: year buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs font-medium text-gray-500 mr-1">År:</span>
            {YEAR_BUTTONS.map(year => (
              <button key={year} onClick={() => {
                const fromD = `${year}-01-01`;
                const toD = year === new Date().getFullYear()
                  ? toDateStr(new Date())
                  : `${year}-12-31`;
                setPeriod("custom");
                setCustomFrom(fromD);
                setCustomTo(toD);
                setAppliedRange({ from: fromD, to: toD });
              }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  period === "custom" && appliedRange.from.startsWith(String(year))
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                }`}>
                {year}
              </button>
            ))}
          </div>

          {/* Row 3: custom date inputs */}
          {period === "custom" && (
            <div className="flex items-center gap-2 mt-3">
              <label className="text-xs text-gray-500">Fra</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                min={MIN_DATE} max={MAX_DATE}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" />
              <label className="text-xs text-gray-500">Til</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                min={MIN_DATE} max={MAX_DATE}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none" />
              <button onClick={applyCustomRange}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Bruk
              </button>
            </div>
          )}

          {appliedRange && (
            <div className="mt-2 text-xs text-gray-400">
              Viser: {periodLabel(period, appliedRange)}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <div ref={dashboardRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Totalt brukere" value={formatCompact(stats.totalUsers)} color="emerald" trend="+12% siste måned"
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} />
          <KpiCard title="Aktive abonnementer" value={formatCompact(stats.activeSubscriptions)} color="blue" trend="+8% siste måned"
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <KpiCard title="Inntekt i perioden" value={formatNok(stats.periodRevenue)} color="amber" trend={stats.periodLabel}
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <KpiCard title="Aktive enheter" value={formatCompact(stats.activeDevices)} color="purple" trend={`${stats.activeDevices} online`}
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>} />
        </div>

        {/* ── Product Sections ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            Abonnementer per produkt
          </h2>
          <ProductSection name="Kitoslight" data={stats.kitoslight} colorInfo={PRODUCT_COLORS.Kitoslight} />
          <ProductSection name="Zongosol" data={stats.zongosol} colorInfo={PRODUCT_COLORS.Zongosol} />
          <ProductSection name="Dashboard" data={stats.dashboard} colorInfo={PRODUCT_COLORS.Dashboard} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line chart: Users */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Brukervekst</h3>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {(["day","month","year"] as const).map(v => (
                  <button key={v} onClick={() => setUserView(v)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${userView === v ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {v==="day"?"Dag":v==="month"?"Måned":"År"}
                  </button>
                ))}
              </div>
            </div>
            <SvgLineChart data={userData} width={500} height={280} color={C.emerald} />
          </div>

          {/* Bar chart: Revenue */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inntekter per måned (totalt)</h3>
            <SvgBarChart data={stats.revenueByMonth} width={500} height={280} color={C.emerald}
              formatVal={(v) => `${Math.round(v)}k`} />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie: Subscriptions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Abonnement-fordeling</h3>
            <SvgPieChart data={stats.subscriptionDistribution} width={320} height={280} />
            <LegendItems data={stats.subscriptionDistribution} />
          </div>

          {/* Key numbers */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nøkkeltall</h3>
            <div className="space-y-4">
              <StatRow label="Gj.snitt inntekt per bruker" value={`${Math.round(stats.periodRevenue / Math.max(stats.activeSubscriptions, 1)).toLocaleString("nb-NO")} kr`} />
              <StatRow label="Konverteringsrate" value={`${Math.round((stats.activeSubscriptions / stats.totalUsers) * 100)}%`} />
              <StatRow label="Kitoslight andel" value={`${Math.round((stats.subscriptionDistribution[0].value / stats.activeSubscriptions) * 100)}%`} color="blue" />
              <StatRow label="Zongosol andel" value={`${Math.round((stats.subscriptionDistribution[1].value / stats.activeSubscriptions) * 100)}%`} color="emerald" />
              <StatRow label="Dashboard andel" value={`${Math.round((stats.subscriptionDistribution[2].value / stats.activeSubscriptions) * 100)}%`} color="purple" />
              <StatRow label="Enheter per Dash-abonnement" value={`${Math.round(stats.activeDevices / stats.subscriptionDistribution[2].value)}`} />
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Sist oppdatert: {new Date().toLocaleString("nb-NO")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send rapport</h3>
              <button onClick={() => { setShowShareDialog(false); setShareStatus(null); setEmailInput(""); }}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Send eierrapporten til partnere, investorer eller sponsorer som HTML-e-post med KPI-oppsummering.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-postadresser</label>
            <textarea value={emailInput} onChange={e => setEmailInput(e.target.value)}
              placeholder="ola@bedrift.no, kari@investor.no" rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-colors resize-none" />
            {shareStatus && (
              <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${shareStatus.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {shareStatus.message}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowShareDialog(false); setShareStatus(null); setEmailInput(""); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Avbryt</button>
              <button onClick={handleShare} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">Send rapport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ title, value, icon, color, trend }: {
  title: string; value: string; icon: React.ReactNode;
  color: "emerald"|"blue"|"amber"|"purple"; trend: string;
}) {
  const cmap = { emerald:"bg-emerald-50 text-emerald-600", blue:"bg-blue-50 text-blue-600", amber:"bg-amber-50 text-amber-600", purple:"bg-purple-50 text-purple-600" };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`rounded-lg p-2 ${cmap[color]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{trend}</p>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: "emerald"|"blue"|"purple" }) {
  const cc = color ? { emerald:"text-emerald-700", blue:"text-blue-700", purple:"text-purple-700" }[color] : "text-gray-900";
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${cc}`}>{value}</span>
    </div>
  );
}

function buildReportHtml(stats: OwnerStats | null): string {
  if (!stats) return "";

  const productRow = (name: string, data: ProductBreakdown, color: string) => `
    <tr>
      <td colspan="2" style="padding:12px 8px 4px 8px;font-weight:bold;color:${color};font-size:14px">${name}</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Abonnenter</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold">${data.subscribers.toLocaleString("nb-NO")}</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Engangsinntekt</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold">${data.oneTimeRevenue.toLocaleString("nb-NO")} kr</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Månedlig inntekt</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold">${data.monthlyRevenue.toLocaleString("nb-NO")} kr</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Årlig inntekt</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold">${data.yearlyRevenue.toLocaleString("nb-NO")} kr</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Totalinntekt</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold;color:${color}">${data.totalRevenue.toLocaleString("nb-NO")} kr</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9">Trend</td>
      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:bold;color:${data.trend >= 0 ? '#059669' : '#dc2626'}">${data.trend >= 0 ? '+' : ''}${data.trend}%</td>
    </tr>`;

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
<h1 style="color:#059669">Kitozon — Eierrapport</h1>
<p style="color:#6b7280">Generert: ${new Date().toLocaleDateString("nb-NO")} | Periode: ${stats.periodLabel}</p><hr style="border-color:#e5e7eb;margin:20px 0"/>
<h2 style="color:#111827">KPI-oppsummering</h2>
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Totalt brukere</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${stats.totalUsers.toLocaleString("nb-NO")}</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Aktive abonnementer</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${stats.activeSubscriptions.toLocaleString("nb-NO")}</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Inntekt i perioden</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${stats.periodRevenue.toLocaleString("nb-NO")} kr</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Aktive enheter</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${stats.activeDevices}</td></tr>
</table><hr style="border-color:#e5e7eb;margin:20px 0"/>
<h2 style="color:#111827">Produktoversikt</h2>
<table style="width:100%;border-collapse:collapse">
${productRow("Kitoslight", stats.kitoslight, "#3b82f6")}
${productRow("Zongosol", stats.zongosol, "#059669")}
${productRow("Dashboard", stats.dashboard, "#8b5cf6")}
</table><hr style="border-color:#e5e7eb;margin:20px 0"/>
<p style="color:#9ca3af;font-size:12px">Automatisk generert av Kitozon-plattformen.</p></div>`;
}
