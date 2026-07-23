import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  devices,
  cities,
  deviceTypeMeta,
  gasThresholds,
  cityCoords,
} from "~/data/kitoslight-devices";
import type { Device, DeviceType, GasMetrics } from "~/data/kitoslight-devices";
import { MapView } from "~/components/KitoslightMap";
import { useLanguage } from "~/lib/i18n.tsx";
import { formatPriceCurrency } from "~/lib/currency";

export const Route = createFileRoute("/kitoslight/")({
  component: KitoslightPage,
});

// ── Live update helpers ─────────────────────────────────────────────────
function jitter(val: number, pct: number): number {
  return val + val * ((Math.random() - 0.5) * 2 * pct);
}
function jitterInt(val: number, pct: number): number {
  return Math.max(0, Math.round(val + val * ((Math.random() - 0.5) * 2 * pct)));
}

function randomizeDevice(d: Device): Device {
  const isOnline = d.status === "online";
  return {
    ...d,
    metrics: {
      ...d.metrics,
      solarEnergyKW: isOnline ? Math.max(0, jitter(d.metrics.solarEnergyKW, 0.08)) : 0,
      co2ppm: isOnline ? jitterInt(d.metrics.co2ppm, 0.03) : d.metrics.co2ppm,
      no2ppb: isOnline ? jitterInt(d.metrics.no2ppb, 0.05) : d.metrics.no2ppb,
      temperatureC: isOnline ? jitter(d.metrics.temperatureC, 0.03) : d.metrics.temperatureC,
    },
    gas: {
      so2ppm: isOnline ? Math.max(0, jitter(d.gas.so2ppm, 0.06)) : d.gas.so2ppm,
      h2sppm: isOnline ? Math.max(0, jitter(d.gas.h2sppm, 0.08)) : d.gas.h2sppm,
      coppm: isOnline ? Math.max(0, jitter(d.gas.coppm, 0.07)) : d.gas.coppm,
      no2ppm: isOnline ? Math.max(0, jitter(d.gas.no2ppm, 0.05)) : d.gas.no2ppm,
      pm25: isOnline ? Math.max(0, jitter(d.gas.pm25, 0.06)) : d.gas.pm25,
    },
    charging: {
      ...d.charging,
      phonesCharging: isOnline && d.type !== "sensor-pole" ? Math.max(0, jitterInt(d.charging.phonesCharging, 0.3)) : 0,
    },
    wifi: {
      ...d.wifi,
      usersConnected: isOnline && d.type !== "sensor-pole" ? Math.max(0, jitterInt(d.wifi.usersConnected, 0.25)) : 0,
    },
    connectedUsers: isOnline && d.type !== "sensor-pole"
      ? d.connectedUsers.map((u) => ({
          ...u,
          chargeMin: Math.max(0, u.chargeMin + Math.floor(Math.random() * 3)),
          wifiMin: Math.max(0, u.wifiMin + Math.floor(Math.random() * 3)),
        }))
      : d.connectedUsers,
  };
}

// ── Aggregate stats ────────────────────────────────────────────────────
function useAggregateStats(devs: Device[]) {
  return useMemo(() => {
    const online = devs.filter((d) => d.status === "online");
    const totalEnergy = online.reduce((s, d) => s + d.metrics.solarEnergyKW, 0);
    const co2Reduced = totalEnergy * 0.45;
    const totalWifi = online.reduce((s, d) => s + d.wifi.usersConnected, 0);
    const totalCharging = online.reduce((s, d) => s + d.charging.phonesCharging, 0);
    const gasAlertDevices = online.filter(
      (d) => d.gas.so2ppm > 2 || d.gas.h2sppm > 0.5 || d.gas.coppm > 9
    );
    return {
      totalDevices: devs.length,
      onlineDevices: online.length,
      totalEnergyKWh: totalEnergy,
      co2ReducedKg: Math.round(co2Reduced * 10) / 10,
      activeCharging: totalCharging,
      totalWifi,
      gasAlerts: gasAlertDevices.length,
    };
  }, [devs]);
}

// ── Main page ──────────────────────────────────────────────────────────
function KitoslightPage() {
  const { t, currency } = useLanguage();
  const [filterCity, setFilterCity] = useState("All");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [liveDevices, setLiveDevices] = useState(devices);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const displayDevices = liveMode ? liveDevices : devices;
  const stats = useAggregateStats(displayDevices);

  const filteredDevices =
    filterCity === "All" ? displayDevices : displayDevices.filter((d) => d.city === filterCity);

  const typeCounts = useMemo(() => {
    const counts: Record<DeviceType, number> = {
      "smart-bench": 0,
      "bus-shelter": 0,
      "sensor-pole": 0,
    };
    filteredDevices.forEach((d) => counts[d.type]++);
    return counts;
  }, [filteredDevices]);

  // Live mode interval
  useEffect(() => {
    if (!liveMode) {
      setLiveDevices(devices);
      return;
    }
    const interval = setInterval(() => {
      setLiveDevices((prev) => prev.map(randomizeDevice));
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [liveMode]);

  // Seconds ago ticker
  useEffect(() => {
    if (!liveMode) return;
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [liveMode, lastUpdate]);

  const cityTabs = ["All", ...cities];

  return (
    <main className="flex-1 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* ── Enhanced Stats Overview Bar ────────────────────────────── */}
      <section className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{t("kitoslight.title")}</h1>
              <span className="text-xs text-gray-400 hidden sm:inline">{t("kitoslight.envPlatform")}</span>
            </div>

            {/* Live Mode Toggle */}
            <div className="flex items-center gap-3">
              {liveMode && (
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {t("kitoslight.lastUpdated")} {secondsAgo}{t("kitoslight.secondsAgo")}
                </span>
              )}
              <button
                onClick={() => {
                  setLiveMode(!liveMode);
                  if (!liveMode) {
                    setLastUpdate(new Date());
                    setSecondsAgo(0);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                  liveMode
                    ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-400 shadow-md shadow-emerald-200"
                    : "bg-gray-100 text-gray-500 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${liveMode ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
                />
                {t("kitoslight.liveMode")} {liveMode ? t("kitoslight.liveOn") : t("kitoslight.liveOff")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            <StatCard
              label={t("kitoslight.devicesOnline")}
              value={`${stats.onlineDevices}/${stats.totalDevices}`}
              icon=""
              color="emerald"
            />
            <StatCard
              label={t("kitoslight.energyToday")}
              value={`${stats.totalEnergyKWh.toFixed(1)} kWh`}
              color="yellow"
            />
            <StatCard
              label={t("kitoslight.wifiUsers")}
              value={String(stats.totalWifi)}
              color="blue"
            />
            <StatCard
              label={t("kitoslight.phonesCharging")}
              value={String(stats.activeCharging)}
              color="indigo"
            />
            <StatCard
              label={t("kitoslight.co2Reduced")}
              value={`${stats.co2ReducedKg} kg`}
              color="green"
            />
            <StatCard
              label={t("kitoslight.gasAlerts")}
              value={String(stats.gasAlerts)}
              color={stats.gasAlerts > 0 ? "red" : "gray"}
            />
          </div>
        </div>
      </section>

      {/* ── Main Content: Map + Sidebar ────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        {/* City Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm font-medium text-gray-500 mr-1">{t("kitoslight.filter")}</span>
          {cityTabs.map((city) => (
            <button
              key={city}
              onClick={() => {
                setFilterCity(city);
                setSelectedDevice(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                filterCity === city
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {city === "All" ? t("kitoslight.filterAll") : city}
              {city === "Goma" && <span className="ml-1"></span>}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {filteredDevices.length} {filteredDevices.length !== 1 ? t("kitoslight.devices") : t("kitoslight.device")}
          </span>
        </div>

        {/* Map + Sidebar grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="relative h-[350px] sm:h-[500px] lg:h-[620px] rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100">
              <MapView
                devices={filteredDevices}
                selectedDeviceId={selectedDevice?.id ?? null}
                onSelectDevice={setSelectedDevice}
                filterCity={filterCity}
              />
              <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm border border-gray-200">
                  {t("kitoslight.clickMarker")}
                </div>
              </div>
              {/* DRC volcano note */}
              {filteredDevices.some((d) => d.country === "DRC Congo") && (
                <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
                  <div className="bg-red-100/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm border border-red-200">
                     {t("kitoslight.nyiragongoAlert")}
                  </div>
                </div>
              )}
            </div>

            {/* Gas Monitoring Panel — below map */}
            <GasMonitoringPanel devices={filteredDevices} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {selectedDevice ? (
              <DeviceDetailPanel
                device={selectedDevice}
                onClose={() => setSelectedDevice(null)}
              />
            ) : (
              <DeviceListPanel
                devices={filteredDevices}
                onSelect={setSelectedDevice}
                typeCounts={typeCounts}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Device Type Cards (merged with Products) ──────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          {t("kitoslight.products")}
        </h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(deviceTypeMeta) as DeviceType[]).map((type) => {
            const meta = deviceTypeMeta[type];
            const productImage =
              type === "smart-bench" ? "bench" :
              type === "bus-shelter" ? "shelter" : "pole";
            const colorBorders: Record<string, string> = {
              emerald: "border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100",
              blue: "border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
              amber: "border-amber-200 hover:border-amber-400 hover:shadow-amber-100",
            };
            const colorBadges: Record<string, string> = {
              emerald: "bg-emerald-100 text-emerald-700",
              blue: "bg-blue-100 text-blue-700",
              amber: "bg-amber-100 text-amber-700",
            };
            return (
              <div
                key={type}
                className={`rounded-xl border ${colorBorders[meta.color]} bg-white overflow-hidden transition-all duration-300 hover:shadow-lg`}
              >
                <img
                  src={`/images/kitoslight-${productImage}.png`}
                  alt={t(meta.label)}
                  className="w-full h-40 object-cover"
                />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t(meta.label)}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorBadges[meta.color]}`}>
                        {typeCounts[type]} {t("kitoslight.deployed")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{t(meta.description)}</p>
                  <ul className="space-y-1.5">
                    {meta.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t(feat)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          {/* Solar Panel System */}
          <div className="rounded-xl border border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg">
            <img
              src="/images/kitoslight-solar.png"
              alt={t("Solar Panel System")}
              className="w-full h-40 object-cover"
            />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t("Solar Panel System")}</h3>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                    10KW
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t("kitoslight.solarDescription")}
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solar10kw")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solarWarranty")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solarInverter")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solarGrid")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solarMonitor")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.solarCo2")}
                </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-lg font-bold text-emerald-700">
                  {t("kitoslight.from")} {formatPriceCurrency(30000, currency)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{t("Price depends on materials")}</p>
              </div>
            </div>
          </div>

          {/* Battery Storage */}
          <div className="rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg">
            <img
              src="/images/kitoslight-battery.png"
              alt={t("Battery Storage")}
              className="w-full h-40 object-cover"
            />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t("Battery Storage")}</h3>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700">
                    20KWh
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t("kitoslight.batteryDescription")}
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.battery20kwh")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.batteryWarranty")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.batteryBackup")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.batterySmart")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.batteryStack")}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("kitoslight.batteryIp65")}
                </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-lg font-bold text-emerald-700">
                  {t("kitoslight.from")} {formatPriceCurrency(15000, currency)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{t("Price depends on materials")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESG Data Teaser ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-bold">{t("kitoslight.esgTitle")}</h3>
              </div>
              <p className="text-emerald-100 max-w-lg">
                {t("kitoslight.esgDescription")}
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-lg flex-shrink-0"
            >
              {t("kitoslight.openDashboard")}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon?: string;
  color: string;
}) {
  const colorBg: Record<string, string> = {
    emerald: "bg-emerald-50",
    yellow: "bg-yellow-50",
    green: "bg-green-50",
    blue: "bg-blue-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
    gray: "bg-gray-50",
  };
  const colorText: Record<string, string> = {
    emerald: "text-emerald-700",
    yellow: "text-yellow-700",
    green: "text-green-700",
    blue: "text-blue-700",
    indigo: "text-indigo-700",
    red: "text-red-700",
    gray: "text-gray-500",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg ${colorBg[color] || "bg-gray-50"} px-3 py-2`}>
      {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${colorText[color] || "text-gray-500"}`}>
          {label}
        </p>
        <p className={`text-sm font-bold ${colorText[color] || "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}

// ── Gas Monitoring Panel ───────────────────────────────────────────────
function GasMonitoringPanel({ devices }: { devices: Device[] }) {
  const { t } = useLanguage();
  const online = devices.filter((d) => d.status === "online");
  if (online.length === 0) return null;

  // Aggregate gas data
  const avgGas = {
    so2ppm: online.reduce((s, d) => s + d.gas.so2ppm, 0) / online.length,
    h2sppm: online.reduce((s, d) => s + d.gas.h2sppm, 0) / online.length,
    coppm: online.reduce((s, d) => s + d.gas.coppm, 0) / online.length,
    no2ppm: online.reduce((s, d) => s + d.gas.no2ppm, 0) / online.length,
    pm25: online.reduce((s, d) => s + d.gas.pm25, 0) / online.length,
    co2ppm: online.reduce((s, d) => s + d.metrics.co2ppm, 0) / online.length,
  };

  const gasEntries = [
    { key: "so2ppm", value: avgGas.so2ppm, threshold: gasThresholds.so2ppm, icon: "" },
    { key: "h2sppm", value: avgGas.h2sppm, threshold: gasThresholds.h2sppm, icon: "" },
    { key: "coppm", value: avgGas.coppm, threshold: gasThresholds.coppm, icon: "" },
    { key: "no2ppm", value: avgGas.no2ppm, threshold: gasThresholds.no2ppm, icon: "" },
    { key: "pm25", value: avgGas.pm25, threshold: gasThresholds.pm25, icon: "" },
    { key: "co2ppm", value: avgGas.co2ppm, threshold: gasThresholds.co2ppm, icon: "" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl"></span>
            <h3 className="font-semibold text-gray-900">{t("kitoslight.gasMonitoring")}</h3>
          </div>
          <span className="text-xs text-gray-400">{t("kitoslight.devicesReporting", { count: online.length })}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {t("kitoslight.gasThresholds")}{" "}
          <span className="text-emerald-600 font-medium">{t("kitoslight.safe")}</span>,{" "}
          <span className="text-amber-600 font-medium">{t("kitoslight.warning")}</span>,{" "}
          <span className="text-red-600 font-medium">{t("kitoslight.dangerous")}</span>
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {gasEntries.map((entry) => {
          const threshold = entry.threshold;
          const val = entry.value;
          const status = val > threshold.warningMax ? "danger" : val > threshold.safeMax ? "warning" : "safe";
          const maxBar = Math.max(threshold.warningMax * 1.5, val * 1.2);
          const barPct = Math.min((val / maxBar) * 100, 100);
          const warnPct = (threshold.safeMax / maxBar) * 100;
          const dangerPct = (threshold.warningMax / maxBar) * 100;

          const statusColors = {
            safe: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" },
            warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", bar: "bg-amber-500", dot: "bg-amber-500 animate-pulse" },
            danger: { bg: "bg-red-50 border-red-200", text: "text-red-700", bar: "bg-red-500", dot: "bg-red-500 animate-pulse" },
          };
          const sc = statusColors[status];

          // Trend arrow (random for demo — simulated from the data)
          const trend = val > threshold.safeMax ? "↑" : val < threshold.safeMax * 0.3 ? "↓" : "→";
          const trendColor = trend === "↑" ? "text-red-500" : trend === "↓" ? "text-emerald-500" : "text-gray-400";

          return (
            <div
              key={entry.key}
              className={`rounded-xl border ${sc.bg} p-3 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{entry.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{t(threshold.gas)}</span>
                </div>
                <span className={`text-xs font-bold ${sc.text}`}>
                  {status === "danger" ? t("kitoslight.dangerStatus") : status === "warning" ? t("kitoslight.warningStatus") : t("kitoslight.safeStatus")}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-xl font-extrabold ${sc.text}`}>
                  {val < 1 ? val.toFixed(3) : val.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">{threshold.unit}</span>
                <span className={`ml-auto text-xs font-bold ${trendColor}`}>{trend}</span>
              </div>
              {/* Bar gauge */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                {/* Safe zone */}
                <div className="absolute inset-y-0 left-0 bg-emerald-200" style={{ width: `${warnPct}%` }} />
                {/* Warning zone */}
                <div className="absolute inset-y-0 bg-amber-200" style={{ left: `${warnPct}%`, width: `${dangerPct - warnPct}%` }} />
                {/* Danger zone */}
                <div className="absolute inset-y-0 right-0 bg-red-100" style={{ left: `${dangerPct}%` }} />
                {/* Value bar */}
                <div
                  className={`absolute inset-y-0 left-0 ${sc.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 truncate">{t(threshold.description)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Device Detail Panel ────────────────────────────────────────────────
function DeviceDetailPanel({ device, onClose }: { device: Device; onClose: () => void }) {
  const { t } = useLanguage();
  const meta = deviceTypeMeta[device.type];
  const isOnline = device.status === "online";
  const hasCharging = (device.type === "smart-bench" || device.type === "bus-shelter") && isOnline;
  const hasWifi = hasCharging;
  const isGasDanger = isOnline && (
    device.gas.so2ppm > 2 || device.gas.h2sppm > 0.5 || device.gas.coppm > 9
  );
  const estimatedCharge = hasCharging && device.charging.phonesCharging > 0
    ? Math.min(65 + device.charging.avgChargeTimeMin * 1.5, 95)
    : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className={`flex items-center justify-between p-4 border-b ${isGasDanger ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
          <h3 className="font-semibold text-gray-900 truncate">{device.name}</h3>
          {isGasDanger && (
            <span className="inline-flex items-center gap-1 rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-800 flex-shrink-0">
               {t("kitoslight.gas")}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 space-y-3 max-h-[750px] overflow-y-auto">
        {/* Device info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label={t("kitoslight.type")} value={t(meta.label)} />
          <InfoRow label={t("kitoslight.city")} value={`${device.city}, ${device.country === "Norway" ? t("kitoslight.countryNorway") : device.country === "DRC Congo" ? t("kitoslight.countryDrc") : device.country}`} />
          <InfoRow label={t("kitoslight.ipAddress")} value={device.ipAddress} mono />
          <InfoRow label={t("kitoslight.status")} value={t(device.status === "online" ? "kitoslight.statusOnline" : "kitoslight.statusOffline")} capitalize />
        </div>

        {/* Solar & Temp */}
        {isOnline && (
          <>
            <hr className="border-gray-100" />
            <div className="grid grid-cols-2 gap-2">
              <MetricTile label={t("kitoslight.solarEnergy")} value={`${device.metrics.solarEnergyKW.toFixed(2)} kW`} color="emerald" />
              <MetricTile label={t("kitoslight.temperature")} value={`${device.metrics.temperatureC}\u00b0C`} color="gray" />
            </div>
          </>
        )}

        {/* Phone Charging Section */}
        {hasCharging && (
          <>
            <hr className="border-gray-100" />
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                 {t("kitoslight.phoneCharging")}
                {device.charging.phonesCharging > 0 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 kitoslight-charging-dot" />
                )}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label={t("kitoslight.chargingNow")} value={String(device.charging.phonesCharging)} color="emerald" />
                <MetricTile label={t("kitoslight.avgTime")} value={`${device.charging.avgChargeTimeMin} min`} color="blue" />
                <MetricTile label={t("kitoslight.powerPort")} value={`${device.charging.powerOutputW}W`} color="gray" />
                <MetricTile
                  label={t("kitoslight.portsFree")}
                  value={`${device.charging.availablePorts}/${device.charging.totalPorts}`}
                  color={device.charging.availablePorts === 0 ? "red" : "emerald"}
                />
              </div>
              {device.charging.phonesCharging > 0 && (
                <div className="mt-2 bg-emerald-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">
                        {t("kitoslight.estCharge")} <span className="font-bold text-gray-800">0% \u2192 {Math.round(estimatedCharge)}%</span> in {device.charging.avgChargeTimeMin} min
                      </p>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${estimatedCharge}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* WiFi Section */}
        {hasWifi && (
          <>
            <hr className="border-gray-100" />
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                 {t("kitoslight.wifiConnectivity")}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label={t("kitoslight.usersConnected")} value={String(device.wifi.usersConnected)} color="blue" />
                <MetricTile label={t("kitoslight.avgSession")} value={`${device.wifi.avgSessionMin} min`} color="indigo" />
              </div>
            </div>
          </>
        )}

        {/* Connected Users Avatars */}
        {device.connectedUsers.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                 {t("kitoslight.usersNearby", { count: device.connectedUsers.length })}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {device.connectedUsers.map((user) => {
                  const hue = (parseInt(user.id.replace(/\D/g, "").slice(-3)) * 137) % 360;
                  return (
                    <div
                      key={user.id}
                      className="kitoslight-user-avatar group relative"
                      title={`${user.id} — charging ${user.chargeMin} min, WiFi ${user.wifiMin} min`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm cursor-default"
                        style={{ background: `hsl(${hue}, 65%, 50%)` }}
                      >
                        {user.id.slice(-2)}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
                        <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                          <p className="font-semibold">{user.id}</p>
                          <p className="text-gray-300"> {user.chargeMin} min ·  {user.wifiMin} min</p>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5">
                          <div className="w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Live Gas Metrics */}
        {isOnline && (
          <>
            <hr className="border-gray-100" />
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                 {t("kitoslight.gasReadings")}
                {isGasDanger && <span className="text-red-500 text-[10px] font-bold">{t("kitoslight.dangerStatus")}</span>}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <GasMetricRow label="SO₂" value={device.gas.so2ppm} unit="ppm" safeMax={0.5} warnMax={2} />
                <GasMetricRow label="H₂S" value={device.gas.h2sppm} unit="ppm" safeMax={0.1} warnMax={0.5} />
                <GasMetricRow label="CO" value={device.gas.coppm} unit="ppm" safeMax={9} warnMax={25} />
                <GasMetricRow label="NO₂" value={device.gas.no2ppm} unit="ppm" safeMax={0.1} warnMax={0.2} />
                <GasMetricRow label="PM2.5" value={device.gas.pm25} unit="µg/m³" safeMax={15} warnMax={35} />
                <GasMetricRow label="CO₂" value={device.metrics.co2ppm} unit="ppm" safeMax={1000} warnMax={2000} />
              </div>
            </div>
          </>
        )}

        <Link
          to="/dashboard"
          className="block w-full text-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors duration-200 mt-2"
        >
          {t("kitoslight.viewDashboard")}
        </Link>
      </div>
    </div>
  );
}

// ── Gas metric row ────────────────────────────────────────────────────
function GasMetricRow({
  label,
  value,
  unit,
  safeMax,
  warnMax,
}: {
  label: string;
  value: number;
  unit: string;
  safeMax: number;
  warnMax: number;
}) {
  const status = value > warnMax ? "danger" : value > safeMax ? "warning" : "safe";
  const colors = {
    safe: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };
  const trend = value > safeMax ? "↑" : value < safeMax * 0.3 ? "↓" : "→";
  return (
    <div className={`rounded-lg ${colors[status]} p-2`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500">{label}</span>
        <span className="text-[10px] text-gray-400">{trend}</span>
      </div>
      <p className="text-sm font-bold">
        {value < 1 ? value.toFixed(3) : value.toFixed(1)}{" "}
        <span className="text-[10px] font-normal opacity-70">{unit}</span>
      </p>
    </div>
  );
}

// ── Device List Panel ──────────────────────────────────────────────────
function DeviceListPanel({
  devices,
  onSelect,
  typeCounts,
}: {
  devices: Device[];
  onSelect: (d: Device) => void;
  typeCounts: Record<DeviceType, number>;
}) {
  const { t } = useLanguage();
  const typeLabels: Record<DeviceType, string> = {
    "smart-bench": t("kitoslight.smartBenches"),
    "bus-shelter": t("kitoslight.busShelters"),
    "sensor-pole": t("kitoslight.sensorPoles"),
  };
  const typeIconLetters: Record<DeviceType, string> = {
    "smart-bench": "B",
    "bus-shelter": "S",
    "sensor-pole": "P",
  };
  const typeColors: Record<DeviceType, string> = {
    "smart-bench": "bg-emerald-100 text-emerald-700",
    "bus-shelter": "bg-blue-100 text-blue-700",
    "sensor-pole": "bg-amber-100 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-900">{t("kitoslight.deviceListTitle")}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {devices.length} {devices.length !== 1 ? t("kitoslight.devices") : t("kitoslight.device")} — {t("kitoslight.clickToView")}
        </p>
      </div>
      <div className="flex gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
        {(Object.keys(typeCounts) as DeviceType[]).map((type) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[type]}`}
          >
            {typeIconLetters[type]}: {typeCounts[type]}
          </span>
        ))}
      </div>
      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
        {devices.map((device) => {
          const isOnline = device.status === "online";
          const hasGasWarning = isOnline && (device.gas.so2ppm > 2 || device.gas.h2sppm > 0.5 || device.gas.coppm > 9);
          return (
            <button
              key={device.id}
              onClick={() => onSelect(device)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                  {device.name}
                  {hasGasWarning && (
                    <span className="text-[10px] text-red-500 flex-shrink-0"></span>
                  )}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {device.city}, {device.country === "Norway" ? t("kitoslight.countryNorway") : device.country === "DRC Congo" ? t("kitoslight.countryDrc") : device.country} · {(() => { const dtMap: Record<string, string> = { "smart-bench": t("kitoslight.deviceTypeSmartBench"), "bus-shelter": t("kitoslight.deviceTypeBusShelter"), "sensor-pole": t("kitoslight.deviceTypeSensorPole") }; return dtMap[device.type] || device.type; })()}
                  {isOnline && device.type !== "sensor-pole" && device.wifi.usersConnected > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-blue-500">
                      ·  {device.wifi.usersConnected}
                    </span>
                  )}
                  {isOnline && device.type !== "sensor-pole" && device.charging.phonesCharging > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-500">
                      ·  {device.charging.phonesCharging}
                    </span>
                  )}
                </p>
              </div>
              <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
        {devices.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {t("kitoslight.noDevicesCity")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────
function InfoRow({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] text-gray-400">{label}</span>
      <p
        className={`text-sm font-medium text-gray-800 truncate ${mono ? "font-mono" : ""} ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    gray: "bg-gray-50 text-gray-700",
    indigo: "bg-indigo-50 text-indigo-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg ${colorClasses[color] || "bg-gray-50 text-gray-700"} p-2`}>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}



