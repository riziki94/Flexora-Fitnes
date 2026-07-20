import { useMemo } from "react";
import type { Profile } from "~/lib/db-admin";

const TIER_INFO: Record<string, { name: string; price: number; color: string; bgColor: string; icon: string }> = {
  kitoslight: { name: "Kitoslight", price: 29, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", icon: "" },
  zongosol: { name: "Zongosol", price: 49, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200", icon: "" },
  dashboard: { name: "Dashboard", price: 99, color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200", icon: "" },
};

export function SubscriptionsPanel({ users }: { users: Profile[] }) {
  const stats = useMemo(() => {
    const counts: Record<string, number> = { kitoslight: 0, zongosol: 0, dashboard: 0 };
    for (const u of users) {
      const tier = u.subscription_tier || "none";
      if (counts[tier] !== undefined) counts[tier]++;
    }
    return counts;
  }, [users]);

  const totalRevenue = stats.kitoslight * 29 + stats.zongosol * 49 + stats.dashboard * 99;
  const totalSubs = stats.kitoslight + stats.zongosol + stats.dashboard;

  const subs = Object.entries(TIER_INFO).map(([key, info]) => ({
    key,
    ...info,
    count: stats[key] || 0,
    revenue: (stats[key] || 0) * info.price,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase">Active Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalSubs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase">Monthly Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase">Conversion Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {users.length > 0 ? Math.round((totalSubs / users.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Tier Details */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {subs.map((tier) => (
          <div key={tier.key} className={`rounded-xl border-2 ${tier.bgColor} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{tier.icon}</span>
              <span className={`text-xs font-semibold uppercase ${tier.color}`}>{tier.key === "dashboard" ? "Admin" : "Tier"}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">${tier.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
            <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subscribers</span>
                <span className="font-semibold text-gray-900">{tier.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Revenue</span>
                <span className="font-semibold text-gray-900">${tier.revenue}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Share</span>
                <span className="font-semibold text-gray-900">
                  {totalSubs > 0 ? Math.round((tier.count / totalSubs) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          {subs.map((tier) => {
            const pct = totalRevenue > 0 ? (tier.revenue / totalRevenue) * 100 : 0;
            return (
              <div key={tier.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{tier.name}</span>
                  <span className="text-gray-500">${tier.revenue}/mo ({Math.round(pct)}%)</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${tier.key === "dashboard" ? "bg-emerald-500" : tier.key === "zongosol" ? "bg-purple-500" : "bg-blue-500"}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex h-8 rounded-lg overflow-hidden">
          {subs.map((tier) => {
            const pct = totalRevenue > 0 ? (tier.revenue / totalRevenue) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div key={tier.key}
                className={`flex items-center justify-center text-xs font-semibold text-white ${tier.key === "dashboard" ? "bg-emerald-500" : tier.key === "zongosol" ? "bg-purple-500" : "bg-blue-500"}`}
                style={{ width: `${pct}%` }}>
                {pct > 12 ? tier.name : ""}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
