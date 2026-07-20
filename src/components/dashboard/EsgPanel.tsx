import { useState, useMemo, useRef } from "react";
import type { DbDevice } from "~/lib/db-devices";
import type { EsgReport } from "~/lib/db-admin";
import { saveEsgReport } from "~/lib/db-admin";

interface EsgData {
  totalEnergyKWh: number;
  co2ReducedKg: number;
  avgCo2ppm: number;
  avgNo2ppb: number;
  avgSo2ppb: number;
  avgH2sppb: number;
  avgPm25: number;
  avgTemp: number;
  avgHumidity: number;
  onlineCount: number;
  totalDevices: number;
  chargingSessions: number;
}

function computeEsgData(devices: DbDevice[]): EsgData {
  const online = devices.filter((d) => d.status === "online");
  let totalEnergy = 0, totalCo2 = 0, totalNo2 = 0, totalSo2 = 0, totalH2s = 0, totalPm25 = 0;
  let totalTemp = 0, totalHumidity = 0, chargingSessions = 0;
  const metricDevices = online.filter((d) => d.metrics && Object.keys(d.metrics).length > 0);
  const count = metricDevices.length || 1;

  for (const d of online) {
    const m = d.metrics || {};
    totalEnergy += m.solarEnergyKW || 0;
    chargingSessions += m.chargingSessions || 0;
    totalCo2 += m.co2ppm || 0;
    totalNo2 += m.no2ppb || 0;
    totalSo2 += m.so2ppb || 0;
    totalH2s += m.h2sppb || 0;
    totalPm25 += m.pm25 || 0;
    totalTemp += m.temperatureC || 0;
    totalHumidity += m.humidity || 0;
  }

  const co2ReducedKg = totalEnergy * 0.7;
  const uptime = devices.length > 0 ? Math.round((online.length / devices.length) * 100) : 0;

  return {
    totalEnergyKWh: Math.round(totalEnergy * 100) / 100,
    co2ReducedKg: Math.round(co2ReducedKg * 100) / 100,
    avgCo2ppm: Math.round(totalCo2 / count),
    avgNo2ppb: Math.round(totalNo2 / count),
    avgSo2ppb: Math.round(totalSo2 / count),
    avgH2sppb: Math.round(totalH2s / count),
    avgPm25: Math.round(totalPm25 / count),
    avgTemp: Math.round((totalTemp / count) * 10) / 10,
    avgHumidity: Math.round(totalHumidity / count),
    onlineCount: online.length,
    totalDevices: devices.length,
    chargingSessions,
  };
}

export function EsgPanel({ userId, devices, reports, onRefresh }: { userId: string; devices: DbDevice[]; reports: EsgReport[]; onRefresh: () => void }) {
  const [period, setPeriod] = useState("this-month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const esgData = useMemo(() => computeEsgData(devices), [devices]);
  const uptime = esgData.totalDevices > 0 ? Math.round((esgData.onlineCount / esgData.totalDevices) * 100) : 0;

  const reportTitle = period === "this-month"
    ? `ESG Report — ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`
    : period === "last-month"
      ? `ESG Report — ${new Date(new Date().getFullYear(), new Date().getMonth(), 0).toLocaleString("default", { month: "long", year: "numeric" })}`
      : `ESG Report — ${customStart || "?"} to ${customEnd || "?"}`;

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const result = await saveEsgReport({
      userId,
      title: reportTitle,
      reportData: { ...esgData, period, customStart, customEnd, generatedAt: new Date().toISOString(), uptime },
    });
    if (result.ok) {
      setMsg("Report saved successfully!");
      onRefresh();
    } else {
      setMsg(result.error || "Failed to save report");
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Generator Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {period === "custom" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving..." : "Generate & Save Report"}
            </button>
            <button onClick={handlePrint}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Print / PDF
            </button>
          </div>
        </div>
        {msg && <div className={`rounded-lg px-4 py-2 text-sm ${msg.includes("success") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{msg}</div>}
      </div>

      {/* Report Preview */}
      <div ref={printRef} className="rounded-xl border border-gray-200 bg-white p-6 print:p-4 print:shadow-none">
        <div className="print:block">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Kitozon ESG Report</h2>
            <p className="text-sm text-gray-500 mt-1">{reportTitle}</p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              { label: "Total Energy", value: `${esgData.totalEnergyKWh} kWh`, sub: "solar generation" },
              { label: "CO₂ Reduced", value: `${esgData.co2ReducedKg} kg`, sub: "carbon offset" },
              { label: "Device Uptime", value: `${uptime}%`, sub: `${esgData.onlineCount}/${esgData.totalDevices} online` },
              { label: "Charging Sessions", value: `${esgData.chargingSessions}`, sub: "total sessions" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-4">Air Quality Averages</h3>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              { label: "CO₂", value: `${esgData.avgCo2ppm} ppm`, color: "bg-gray-50" },
              { label: "NO₂", value: `${esgData.avgNo2ppb} ppb`, color: "bg-yellow-50" },
              { label: "SO₂", value: `${esgData.avgSo2ppb} ppb`, color: "bg-orange-50" },
              { label: "H₂S", value: `${esgData.avgH2sppb} ppb`, color: "bg-purple-50" },
              { label: "PM2.5", value: `${esgData.avgPm25} µg/m³`, color: "bg-blue-50" },
              { label: "Temperature", value: `${esgData.avgTemp}°C`, color: "bg-red-50" },
              { label: "Humidity", value: `${esgData.avgHumidity}%`, color: "bg-cyan-50" },
            ].map((aq) => (
              <div key={aq.label} className={`rounded-lg border border-gray-100 ${aq.color} p-3`}>
                <p className="text-xs text-gray-500">{aq.label}</p>
                <p className="text-lg font-semibold text-gray-900">{aq.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">Generated on {new Date().toLocaleDateString()} · Kitozon Dashboard</p>
        </div>
      </div>

      {/* Saved Reports */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Saved Reports ({reports.length})</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">No reports saved yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500">{new Date(r.generated_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs text-gray-400">#{r.id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
