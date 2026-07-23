import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Device } from "~/data/kitoslight-devices";
import { useLanguage } from "~/lib/i18n.tsx";
import { cityCoords } from "~/data/kitoslight-devices";

// ── Pulse animation via CSS ────────────────────────────────────────────
const PULSE_STYLE_ID = "kitoslight-pulse-style";
function injectPulseStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes kitoslight-pulse {
      0% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.5); opacity: 0.15; }
      100% { transform: scale(1); opacity: 0.7; }
    }
    @keyframes kitoslight-pulse-ring {
      0% { r: 16; opacity: 0.5; }
      100% { r: 28; opacity: 0; }
    }
    @keyframes charging-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .kitoslight-marker-online {
      animation: kitoslight-pulse 2.5s ease-in-out infinite;
    }
    .kitoslight-marker-warning {
      animation: kitoslight-pulse 1.2s ease-in-out infinite;
    }
    .kitoslight-charging-dot {
      animation: charging-blink 1.2s ease-in-out infinite;
    }
    .kitoslight-user-avatar {
      transition: transform 0.2s ease;
    }
    .kitoslight-user-avatar:hover {
      transform: scale(1.2);
      z-index: 10000 !important;
    }
    .kitoslight-popup {
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    /* Cluster styling */
    .cluster-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: white;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    }
    .cluster-marker:hover {
      transform: scale(1.15);
    }
  `;
  document.head.appendChild(style);
}

// ── Style Injector (child of MapContainer) ────────────────────────────────
function StyleInjector() {
  useEffect(() => {
    injectPulseStyle();
  }, []);
  return null;
}

// ── Create animated SVG marker ─────────────────────────────────────────
function createMarkerIcon(color: string, status: string, isWarning: boolean) {
  const pulseClass = status === "online" 
    ? (isWarning ? "kitoslight-marker-warning" : "kitoslight-marker-online")
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
      <defs>
        <filter id="shadow-${color.replace('#','')}">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <!-- Pulse ring -->
      <circle class="${pulseClass}" cx="22" cy="20" r="14" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"
        style="transform-origin: 22px 20px;"/>
      <!-- Main body -->
      <circle cx="22" cy="20" r="14" fill="${color}" stroke="white" stroke-width="3" filter="url(#shadow-${color.replace('#','')})"/>
      <polygon points="22,48 12,30 32,30" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow-${color.replace('#','')})"/>
      <!-- Inner icon circle -->
      <circle cx="22" cy="20" r="6" fill="white" opacity="0.95"/>
      ${status === "online"
        ? '<circle cx="22" cy="20" r="3" fill="#10b981"/>'
        : '<circle cx="22" cy="20" r="3" fill="#ef4444"/>'}
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -54],
  });
}

const markerColors: Record<string, string> = {
  "smart-bench": "#10b981",
  "bus-shelter": "#3b82f6",
  "sensor-pole": "#f59e0b",
};

// ── Simple cluster logic ───────────────────────────────────────────────
interface Cluster {
  lat: number;
  lng: number;
  devices: Device[];
  count: number;
}

function clusterDevices(devices: Device[], zoom: number, maxDistDeg: number): Cluster[] {
  if (zoom >= 10 || devices.length <= 3) {
    return devices.map((d) => ({ lat: d.lat, lng: d.lng, devices: [d], count: 1 }));
  }
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();
  for (const d of devices) {
    if (assigned.has(d.id)) continue;
    const cluster: Cluster = { lat: d.lat, lng: d.lng, devices: [d], count: 1 };
    assigned.add(d.id);
    for (const d2 of devices) {
      if (assigned.has(d2.id)) continue;
      const dist = Math.sqrt((d.lat - d2.lat) ** 2 + (d.lng - d2.lng) ** 2);
      if (dist < maxDistDeg) {
        cluster.devices.push(d2);
        cluster.count++;
        assigned.add(d2.id);
      }
    }
    // Average position
    cluster.lat = cluster.devices.reduce((s, x) => s + x.lat, 0) / cluster.count;
    cluster.lng = cluster.devices.reduce((s, x) => s + x.lng, 0) / cluster.count;
    clusters.push(cluster);
  }
  return clusters;
}

function createClusterIcon(count: number, devices: Device[]) {
  const hasWarning = devices.some((d) => d.status === "online" && d.gas.so2ppm > 2);
  const bgColor = hasWarning ? "#ef4444" : "#6366f1";
  const size = Math.min(44 + count * 4, 64);
  const html = `
    <div class="cluster-marker" style="
      width: ${size}px; height: ${size}px;
      background: ${bgColor};
      border: 3px solid white;
    ">
      ${count}
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Recenter on filter change ──────────────────────────────────────────
function MapRecenter({
  center,
  zoom,
  filterCity,
}: {
  center: [number, number];
  zoom: number;
  filterCity: string;
}) {
  const map = useMap();
  const prevCity = useRef(filterCity);

  useEffect(() => {
    if (filterCity !== "All" && filterCity !== prevCity.current) {
      // Fly to city coordinates
      const cityCenter = cityCoords[filterCity];
      if (cityCenter) {
        map.flyTo(cityCenter, 13, { duration: 1.2 });
      }
    } else {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
    prevCity.current = filterCity;
  }, [map, center, zoom, filterCity]);

  return null;
}

// ── Zoom listener ─────────────────────────────────────────────────────
function useZoom(): number {
  const [zoom, setZoom] = useState(5);
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
    load: (e) => setZoom(e.target.getZoom()),
  });
  return zoom;
}

// ── Map Search Control (Nominatim geocoding) ──────────────────────────

function MapSearchControl() {
  const { t } = useLanguage();
  const map = useMap();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      setSearching(true);
      setError("");
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en,no" },
        });
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();
        if (data.length > 0) {
          const { lat, lon } = data[0];
          map.flyTo([parseFloat(lat), parseFloat(lon)], 14, { duration: 1.5 });
          setError("");
        } else {
          setError(t("kitoslight.locationNotFound"));
        }
      } catch {
        setError(t("kitoslight.searchFailed"));
      } finally {
        setSearching(false);
      }
    },
    [query, map],
  );

  const container = map.getContainer();
  if (!mounted || !container) return null;

  return createPortal(
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-2 py-1.5"
      >
        <svg className="h-4 w-4 text-gray-400 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError("");
          }}
          placeholder={t("kitoslight.searchPlaceholder")}
          className="text-sm px-1 py-1 bg-transparent outline-none text-gray-700 w-44 sm:w-56 placeholder:text-gray-400"
          aria-label="Search location"
        />
        <button
          type="submit"
          disabled={searching}
          className="px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait transition-colors flex-shrink-0"
        >
          {searching ? t("kitoslight.searching") : t("kitoslight.go")}
        </button>
      </form>
      {error && (
        <p className="text-xs text-red-600 mt-1 text-center bg-white/90 rounded-md px-2 py-0.5 shadow-sm">
          {error}
        </p>
      )}
    </div>,
    container,
  );
}

interface LeafletMapProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (device: Device) => void;
  filterCity: string;
}

export default function LeafletMap({
  devices,
  selectedDeviceId,
  onSelectDevice,
  filterCity,
}: LeafletMapProps) {
  const markersRef = useRef<Record<string, L.Marker>>({});

  const filteredDevices =
    filterCity === "All" ? devices : devices.filter((d) => d.city === filterCity);

  const defaultCenter: [number, number] = [58, 10]; // centered between Norway and DRC
  const center: [number, number] =
    filteredDevices.length > 0
      ? [
          filteredDevices.reduce((s, d) => s + d.lat, 0) / filteredDevices.length,
          filteredDevices.reduce((s, d) => s + d.lng, 0) / filteredDevices.length,
        ]
      : defaultCenter;
  const zoom = filterCity === "All" ? 4 : 13;

  const handleMarkerRef = useCallback(
    (deviceId: string) => (marker: L.Marker | null) => {
      if (marker) {
        markersRef.current[deviceId] = marker;
        if (deviceId === selectedDeviceId) {
          setTimeout(() => marker.openPopup(), 100);
        }
      }
    },
    [selectedDeviceId],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-2xl z-0"
      zoomControl={true}
      scrollWheelZoom={true}
    
    >
      <StyleInjector />
      <MapSearchControl />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapRecenter center={center} zoom={zoom} filterCity={filterCity} />
      <ZoomClusterContent
        filteredDevices={filteredDevices}
        handleMarkerRef={handleMarkerRef}
        onSelectDevice={onSelectDevice}
        selectedDeviceId={selectedDeviceId}
      />
    </MapContainer>
  );
}

// ── Inner component that re-renders on zoom for clustering ─────────────
function ZoomClusterContent({
  filteredDevices,
  handleMarkerRef,
  onSelectDevice,
  selectedDeviceId,
}: {
  filteredDevices: Device[];
  handleMarkerRef: (id: string) => (m: L.Marker | null) => void;
  onSelectDevice: (d: Device) => void;
  selectedDeviceId: string | null;
}) {
  const zoom = useZoom();
  const clusters = clusterDevices(filteredDevices, zoom, 1.5);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.count === 1) {
          const device = cluster.devices[0];
          return <SingleMarker key={device.id} device={device} handleMarkerRef={handleMarkerRef} onSelectDevice={onSelectDevice} />;
        }
        return (
          <Marker
            key={`cluster-${cluster.lat.toFixed(4)}-${cluster.lng.toFixed(4)}`}
            position={[cluster.lat, cluster.lng]}
            icon={createClusterIcon(cluster.count, cluster.devices)}
            eventHandlers={{
              click: () => {
                // Show the first device, or we could expand
                if (cluster.count > 0) onSelectDevice(cluster.devices[0]);
              },
            }}
          >
            <Popup maxWidth={320} minWidth={260}>
              <ClusterPopup devices={cluster.devices} onSelect={onSelectDevice} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function ClusterPopup({ devices, onSelect }: { devices: Device[]; onSelect: (d: Device) => void }) {
  const { t } = useLanguage();
  return (
    <div className="kitoslight-popup p-1 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{t("kitoslight.devicesInArea", { count: devices.length })}</p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {devices.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 flex items-center gap-2 text-xs"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${d.status === "online" ? "bg-emerald-500" : "bg-red-400"}`}
            />
            <span className="font-medium text-gray-700">{d.name}</span>
            <span className="text-gray-400 ml-auto">{d.city}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Single device marker ───────────────────────────────────────────────
function SingleMarker({
  device,
  handleMarkerRef,
  onSelectDevice,
}: {
  device: Device;
  handleMarkerRef: (id: string) => (m: L.Marker | null) => void;
  onSelectDevice: (d: Device) => void;
}) {
  const isOnline = device.status === "online";
  const isGasWarning = isOnline && (device.gas.so2ppm > 2 || device.gas.h2sppm > 0.5 || device.gas.coppm > 9);
  const color = markerColors[device.type] || "#6b7280";

  return (
    <Marker
      key={device.id}
      position={[device.lat, device.lng]}
      icon={createMarkerIcon(color, device.status, isGasWarning)}
      ref={handleMarkerRef(device.id)}
      eventHandlers={{
        click: () => onSelectDevice(device),
      }}
    >
      <Popup maxWidth={340} minWidth={280}>
        <EnhancedPopup device={device} />
      </Popup>
    </Marker>
  );
}

// ── Enhanced popup ─────────────────────────────────────────────────────
function EnhancedPopup({ device }: { device: Device }) {
  const { t } = useLanguage();
  const isOnline = device.status === "online";
  const d = device;
  const hasCharging = (d.type === "smart-bench" || d.type === "bus-shelter") && isOnline;
  const hasWifi = hasCharging;
  const isGasDanger = isOnline && (d.gas.so2ppm > 2 || d.gas.h2sppm > 0.5 || d.gas.coppm > 9);
  const estimatedCharge = hasCharging && d.charging.phonesCharging > 0
    ? Math.min(65 + d.charging.avgChargeTimeMin * 1.5, 95)
    : 0;

  return (
    <div className="kitoslight-popup p-1 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`}
        />
        <strong className="text-gray-900">{d.name}</strong>
        {isGasDanger && (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ml-auto">
             {t("kitoslight.gasAlertPopup")}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>{t("kitoslight.type")}</span>
          <span className="font-medium text-gray-700 capitalize">{d.type.replace("-", " ")}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("kitoslight.location")}</span>
          <span className="font-medium text-gray-700">{d.city}, {d.country}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("kitoslight.ipLabel")}</span>
          <span className="font-medium text-gray-700 font-mono">{d.ipAddress}</span>
        </div>
      </div>

      {/* Charging section */}
      {hasCharging && (
        <>
          <hr className="my-2 border-gray-100" />
          <div className="text-xs">
            <p className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5"> {t("kitoslight.phoneCharging")}</p>
            <div className="flex justify-between">
              <span>{t("kitoslight.phonesChargingNow")}</span>
              <span className="font-bold text-emerald-600">{d.charging.phonesCharging}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("kitoslight.avgChargeTime")}</span>
              <span className="font-medium text-gray-700">{d.charging.avgChargeTimeMin} min</span>
            </div>
            <div className="flex justify-between">
              <span>{t("kitoslight.powerPerPort")}</span>
              <span className="font-medium text-gray-700">{d.charging.powerOutputW}W</span>
            </div>
            <div className="flex justify-between">
              <span>{t("kitoslight.portsAvailable")}</span>
              <span className={`font-medium ${d.charging.availablePorts === 0 ? "text-red-600" : "text-emerald-600"}`}>
                {d.charging.availablePorts}/{d.charging.totalPorts}
              </span>
            </div>
            {/* Estimated charge */}
            {d.charging.phonesCharging > 0 && (
              <div className="mt-1.5 flex items-center gap-2 bg-emerald-50 rounded-lg p-2">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                </svg>
                <div>
                  <span className="text-[10px] text-gray-500">{t("kitoslight.estChargePopup", { minutes: d.charging.avgChargeTimeMin })}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">0%</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${estimatedCharge}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-700">→ {Math.round(estimatedCharge)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* WiFi section */}
      {hasWifi && (
        <>
          <hr className="my-2 border-gray-100" />
          <div className="text-xs">
            <p className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5"> {t("kitoslight.wifiLabel")}</p>
            <div className="flex justify-between">
              <span>{t("kitoslight.usersConnected")}</span>
              <span className="font-bold text-blue-600">{d.wifi.usersConnected}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("kitoslight.avgSession")}</span>
              <span className="font-medium text-gray-700">{d.wifi.avgSessionMin} min</span>
            </div>
          </div>
        </>
      )}

      {/* Gas section */}
      {isOnline && (
        <>
          <hr className="my-2 border-gray-100" />
          <div className="text-xs">
            <p className="font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
               {t("kitoslight.gasReadingsPopup")}
              {isGasDanger && <span className="text-red-500 ml-1"></span>}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <GasRow label="SO₂" value={d.gas.so2ppm} unit="ppm" safeMax={0.5} warnMax={2} />
              <GasRow label="H₂S" value={d.gas.h2sppm} unit="ppm" safeMax={0.1} warnMax={0.5} />
              <GasRow label="CO" value={d.gas.coppm} unit="ppm" safeMax={9} warnMax={25} />
              <GasRow label="NO₂" value={d.gas.no2ppm} unit="ppm" safeMax={0.1} warnMax={0.2} />
              <GasRow label="PM2.5" value={d.gas.pm25} unit="µg/m³" safeMax={15} warnMax={35} />
              <GasRow label="CO₂" value={d.metrics.co2ppm} unit="ppm" safeMax={1000} warnMax={2000} />
            </div>
          </div>
        </>
      )}

      {/* Solar / Temp */}
      {isOnline && (
        <>
          <hr className="my-2 border-gray-100" />
          <div className="flex justify-between text-xs">
            <span>{t("kitoslight.solarLabel")}</span>
            <span className="font-medium text-emerald-600">{d.metrics.solarEnergyKW.toFixed(2)} kW</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>{t("kitoslight.temperature")}</span>
            <span className="font-medium text-gray-700">{d.metrics.temperatureC}°C</span>
          </div>
        </>
      )}
    </div>
  );
}

function GasRow({
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
  const colorMap = { safe: "text-emerald-600", warning: "text-amber-600", danger: "text-red-600" };
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${colorMap[status]}`}>
        {value.toFixed(value < 1 ? 3 : 1)} {unit}
      </span>
    </div>
  );
}
