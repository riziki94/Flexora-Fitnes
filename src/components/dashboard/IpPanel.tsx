import { useState, useMemo } from "react";
import type { DbDevice } from "~/lib/db-devices";
import { simulateLiveData } from "~/lib/db-admin";

const TYPE_LABELS: Record<string, string> = {
  "smart-bench": "Smart Bench",
  "bus-shelter": "Bus Shelter",
  "sensor-pole": "Sensor Pole",
};

export function IpPanel({ devices, onRefresh }: { devices: DbDevice[]; onRefresh: () => void }) {
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState("");

  const devicesWithIp = useMemo(() => devices.filter((d) => d.ip_address), [devices]);
  const online = devicesWithIp.filter((d) => d.status === "online").length;

  const handleSimulate = async () => {
    setUpdating(true);
    setMsg("");
    const result = await simulateLiveData();
    setMsg(result.ok ? result.message || "Data refreshed" : "Simulation failed");
    setUpdating(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">IP Integration</h3>
            <p className="text-sm text-gray-600 mt-1">
              All Kitoslight devices connect via their assigned IP addresses and stream real-time environmental data to the dashboard.
              Each device reports metrics including solar energy production, charging sessions, and air quality readings.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">IP-Connected Devices</p>
          <p className="text-2xl font-bold text-gray-900">{devicesWithIp.length}</p>
          <p className="text-xs text-gray-400 mt-1">{online} online</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Data Throughput</p>
          <p className="text-2xl font-bold text-gray-900">~{Math.round(devicesWithIp.length * 0.15 * 10) / 10} KB/s</p>
          <p className="text-xs text-gray-400 mt-1">estimated</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Live Simulation</p>
            <p className="text-sm text-gray-600 mt-1">Refresh all device metrics with simulated real-time data</p>
          </div>
          <button onClick={handleSimulate} disabled={updating}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 w-fit">
            <svg className={`h-3.5 w-3.5 ${updating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {updating ? "Refreshing..." : "Refresh Live Data"}
          </button>
        </div>
      </div>

      {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      {/* Device → IP Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Device → IP Mapping</h3>
          <p className="text-xs text-gray-500 mt-0.5">Real-time data feed status for all connected devices</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Device</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {devicesWithIp.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No devices with IP addresses</td></tr>
              ) : (
                devicesWithIp.map((d) => {
                  const m = d.metrics || {};
                  const hasData = Object.keys(m).length > 0 && m.solarEnergyKW !== undefined;
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[d.device_type] || d.device_type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600">{d.ip_address}</td>
                      <td className="px-4 py-3 text-gray-600">{d.city || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {hasData ? `${new Date().toLocaleTimeString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === "online" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${d.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
