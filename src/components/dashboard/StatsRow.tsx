import type { DashboardStats } from "~/lib/db-admin";

const COLORS: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-50/50",
  yellow: "border-l-yellow-500 bg-yellow-50/50",
  emerald: "border-l-emerald-500 bg-emerald-50/50",
  purple: "border-l-purple-500 bg-purple-50/50",
  indigo: "border-l-indigo-500 bg-indigo-50/50",
};

export function StatsRow({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  const cards = [
    { label: "Total Devices", value: stats ? `${stats.onlineDevices}/${stats.totalDevices} online` : "—", sub: "online / total", icon: "", color: "blue" },
    { label: "Energy Produced", value: stats ? `${stats.totalEnergyKWh} kWh` : "—", sub: "solar generation", icon: "", color: "yellow" },
    { label: "CO₂ Reduced", value: stats ? `${stats.co2ReducedKg} kg` : "—", sub: "carbon offset", icon: "", color: "emerald" },
    { label: "Active Charging", value: stats ? `${stats.activeCharging}` : "—", sub: "sessions", icon: "", color: "purple" },
    { label: "Users", value: stats ? `${stats.usersRegistered}` : "—", sub: "registered", icon: "", color: "indigo" },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border border-gray-200 bg-white border-l-4 ${COLORS[card.color]} p-4`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
            <span className="text-lg">{card.icon}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
          <p className="text-xs text-gray-400">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
