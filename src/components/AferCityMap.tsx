import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Rectangle,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Types ────────────────────────────────────────────────────────────────
export const OBJECT_TYPES = [
  { id: "container_house", label: "Container House", icon: "", color: "#d97706", w: 6, h: 12, category: "residential" },
  { id: "solar_light", label: "Solar Street Light", icon: "", color: "#eab308", w: 0.5, h: 0.5, category: "infrastructure" },
  { id: "smart_bench", label: "Smart Bench", icon: "", color: "#3b82f6", w: 2, h: 1, category: "infrastructure" },
  { id: "bus_shelter", label: "Smart Bus Shelter", icon: "", color: "#06b6d4", w: 4, h: 2, category: "infrastructure" },
  { id: "battery_storage", label: "Battery Storage", icon: "", color: "#a855f7", w: 6, h: 3, category: "energy" },
  { id: "school", label: "School", icon: "", color: "#ef4444", w: 30, h: 20, category: "community" },
  { id: "hospital", label: "Hospital", icon: "", color: "#f8fafc", w: 40, h: 25, category: "community" },
  { id: "industry", label: "Industry", icon: "", color: "#64748b", w: 25, h: 15, category: "commercial" },
  { id: "park", label: "Park / Green Area", icon: "", color: "#22c55e", w: 20, h: 20, category: "green" },
  { id: "parking", label: "Parking Area", icon: "🅿", color: "#94a3b8", w: 15, h: 10, category: "infrastructure" },
  { id: "ev_charger", label: "EV Charging Station", icon: "", color: "#84cc16", w: 1, h: 1, category: "energy" },
  { id: "road", label: "Road", icon: "", color: "#4b5563", w: 4, h: 0, category: "infrastructure" },
] as const;

export type ObjectTypeId = (typeof OBJECT_TYPES)[number]["id"];

export interface PlacedObject {
  id: string;
  typeId: ObjectTypeId;
  lat: number;
  lng: number;
  name: string;
  /** For roads: array of [lat, lng] waypoints */
  roadPoints?: [number, number][];
  /** Rotation in degrees (optional) */
  rotation?: number;
}

export const CITY_LOCATIONS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "Oslo": { lat: 59.9139, lng: 10.7522, zoom: 16 },
  "Bergen": { lat: 60.3913, lng: 5.3221, zoom: 16 },
  "Trondheim": { lat: 63.4305, lng: 10.3951, zoom: 16 },
  "Stavanger": { lat: 58.9700, lng: 5.7331, zoom: 16 },
  "Tromsø": { lat: 69.6496, lng: 18.9560, zoom: 16 },
  "Drammen": { lat: 59.7441, lng: 10.2045, zoom: 16 },
  "Kristiansand": { lat: 58.1467, lng: 7.9956, zoom: 16 },
  "Fredrikstad": { lat: 59.2181, lng: 10.9298, zoom: 16 },
};

// Grid snap ~10 meters at 60°N
const GRID_LAT = 0.00009; // ~10m
const GRID_LNG = 0.00018; // ~10m at 60°N

export function snapToGrid(lat: number, lng: number): [number, number] {
  return [
    Math.round(lat / GRID_LAT) * GRID_LAT,
    Math.round(lng / GRID_LNG) * GRID_LNG,
  ];
}

// ── CSS injection ────────────────────────────────────────────────────────
const STYLE_ID = "afercity-map-style";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes afercity-pulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.4); opacity: 0.3; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    @keyframes afercity-glow {
      0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor); }
    }
    @keyframes afercity-place-pop {
      0% { transform: scale(0.3); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .afercity-object-marker {
      animation: afercity-place-pop 0.35s ease-out;
    }
    .afercity-pulse-glow {
      animation: afercity-glow 2s ease-in-out infinite;
    }
    .afercity-popup {
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    .afercity-crosshair {
      cursor: crosshair !important;
    }
    .afercity-crosshair .leaflet-container {
      cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);
}

function StyleInjector() {
  useEffect(() => { injectStyles(); }, []);
  return null;
}

// Map loading shell used by the route's Suspense fallback
function MapShell() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-emerald-500 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading city map...</p>
      </div>
    </div>
  );
}

// ── Tile layer options ───────────────────────────────────────────────────
const TILE_LAYERS: Record<string, { url: string; attribution: string }> = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
};

// ── Map event handlers ───────────────────────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevRef = useRef<string>("");
  const key = `${center[0].toFixed(4)},${center[1].toFixed(4)},${zoom}`;

  useEffect(() => {
    if (key !== prevRef.current) {
      prevRef.current = key;
      map.flyTo(center, zoom, { duration: 1.0 });
    }
  }, [map, center, zoom, key]);

  return null;
}

// Keep map resize in sync
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ── Grid overlay ─────────────────────────────────────────────────────────
function GridOverlay({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  const [gridLines, setGridLines] = useState<[number, number][][]>([]);

  useEffect(() => {
    const updateGrid = () => {
      const b = bounds || map.getBounds();
      const south = b.getSouth();
      const north = b.getNorth();
      const west = b.getWest();
      const east = b.getEast();

      const lines: [number, number][][] = [];

      // Generate grid lines at ~50m intervals (5 grid cells)
      const latStep = GRID_LAT * 5;
      const lngStep = GRID_LNG * 5;

      // Lat lines
      let lat = Math.floor(south / latStep) * latStep;
      while (lat <= north) {
        lines.push([[lat, west], [lat, east]]);
        lat += latStep;
      }

      // Lng lines
      let lng = Math.floor(west / lngStep) * lngStep;
      while (lng <= east) {
        lines.push([[south, lng], [north, lng]]);
        lng += lngStep;
      }

      setGridLines(lines);
    };

    updateGrid();
    map.on("moveend", updateGrid);
    map.on("zoomend", updateGrid);
    return () => {
      map.off("moveend", updateGrid);
      map.off("zoomend", updateGrid);
    };
  }, [map, bounds]);

  if (gridLines.length === 0) return null;

  return (
    <>
      {gridLines.map((line, i) => (
        <Polyline
          key={i}
          positions={line}
          pathOptions={{
            color: "#ffffff",
            weight: 0.5,
            opacity: 0.25,
            dashArray: "4 8",
            interactive: false,
          }}
        />
      ))}
    </>
  );
}

// ── Object creation helpers ──────────────────────────────────────────────
function getObjectSizeMeters(typeId: ObjectTypeId): { w: number; h: number } {
  const t = OBJECT_TYPES.find((o) => o.id === typeId)!;
  return { w: t.w, h: t.h };
}

function metersToDeg(meters: number, lat: number): number {
  return meters / 111320;
}

function metersToDegLng(meters: number, lat: number): number {
  return meters / (111320 * Math.cos((lat * Math.PI) / 180));
}

function getObjectBounds(obj: PlacedObject): [[number, number], [number, number]] {
  const { w, h } = getObjectSizeMeters(obj.typeId);
  const halfLat = metersToDeg(h / 2, obj.lat);
  const halfLng = metersToDegLng(w / 2, obj.lat);
  return [
    [obj.lat - halfLat, obj.lng - halfLng],
    [obj.lat + halfLat, obj.lng + halfLng],
  ];
}

// ── Object icon creator ──────────────────────────────────────────────────
function createObjectIcon(typeId: ObjectTypeId, scale = 1): L.DivIcon {
  const t = OBJECT_TYPES.find((o) => o.id === typeId)!;
  const size = Math.max(20, Math.min(48, ((t.w + t.h) / 2) * 2.5)) * scale;
  const isBright = t.color === "#f8fafc" || t.color === "#eab308" || t.color === "#84cc16";
  const textColor = isBright ? "#1e293b" : "#ffffff";

  const html = `
    <div style="
      width: ${size}px; height: ${size}px;
      background: ${t.color};
      border-radius: 8px;
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      color: ${textColor};
      transition: transform 0.2s;
    " class="afercity-object-marker afercity-pulse-glow">
      ${t.icon}
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createRoadIcon(): L.DivIcon {
  const html = `
    <div style="
      width: 12px; height: 12px;
      background: #64748b;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// ── Object on map ────────────────────────────────────────────────────────
interface MapObjectLayerProps {
  objects: PlacedObject[];
  selectedObjId: string | null;
  onSelectObject: (obj: PlacedObject) => void;
  onObjectClick: (obj: PlacedObject) => void;
}

function MapObjectLayer({ objects, selectedObjId, onSelectObject, onObjectClick }: MapObjectLayerProps) {
  const highlightStyle = (obj: PlacedObject) => ({
    weight: selectedObjId === obj.id ? 3 : 1.5,
    opacity: selectedObjId === obj.id ? 1 : 0.8,
    dashArray: selectedObjId === obj.id ? "" : "",
  });

  return (
    <>
      {objects.map((obj) => {
        const t = OBJECT_TYPES.find((tp) => tp.id === obj.typeId)!;

        // Roads rendered as polylines
        if (obj.typeId === "road" && obj.roadPoints && obj.roadPoints.length >= 2) {
          return (
            <Polyline
              key={obj.id}
              positions={obj.roadPoints}
              pathOptions={{
                color: "#475569",
                weight: 5,
                opacity: 0.8,
              }}
              eventHandlers={{
                click: () => onObjectClick(obj),
              }}
            />
          );
        }

        // Point objects (small items: solar light, EV charger)
        if (obj.typeId === "solar_light" || obj.typeId === "ev_charger") {
          const isPoint = obj.typeId === "solar_light";
          return (
            <CircleMarker
              key={obj.id}
              center={[obj.lat, obj.lng]}
              radius={isPoint ? 4 : 5}
              pathOptions={{
                color: t.color,
                fillColor: t.color,
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onObjectClick(obj),
              }}
            >
              <Popup maxWidth={280} minWidth={220}>
                <ObjectPopup obj={obj} />
              </Popup>
            </CircleMarker>
          );
        }

        // Park: green polygon
        if (obj.typeId === "park") {
          const bounds = getObjectBounds(obj);
          return (
            <Rectangle
              key={obj.id}
              bounds={bounds as [[number, number], [number, number]]}
              pathOptions={{
                color: "#16a34a",
                fillColor: "#22c55e",
                fillOpacity: 0.35,
                weight: 1.5,
                ...highlightStyle(obj),
              }}
              eventHandlers={{
                click: () => onObjectClick(obj),
              }}
            >
              <Popup maxWidth={280} minWidth={220}>
                <ObjectPopup obj={obj} />
              </Popup>
            </Rectangle>
          );
        }

        // Other objects: rectangles on map
        const bounds = getObjectBounds(obj);
        return (
          <Rectangle
            key={obj.id}
            bounds={bounds as [[number, number], [number, number]]}
            pathOptions={{
              color: t.color,
              fillColor: t.color,
              fillOpacity: obj.typeId === "hospital" ? 0.3 : 0.5,
              weight: selectedObjId === obj.id ? 3 : 1.5,
              opacity: selectedObjId === obj.id ? 1 : 0.75,
            }}
            eventHandlers={{
              click: () => onObjectClick(obj),
            }}
          >
            <Popup maxWidth={300} minWidth={240}>
              <ObjectPopup obj={obj} />
            </Popup>
          </Rectangle>
        );
      })}
    </>
  );
}

// ── Object Popup ─────────────────────────────────────────────────────────
function ObjectPopup({ obj }: { obj: PlacedObject }) {
  const t = OBJECT_TYPES.find((tp) => tp.id === obj.typeId)!;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(i);
  }, []);

  const metrics = useMemo(() => {
    const base = tick * 0.07;
    switch (obj.typeId) {
      case "container_house":
        return [
          [" Solar", `${(4.2 + Math.sin(base) * 1.5).toFixed(1)} kW`],
          [" Battery", `${Math.round(78 + Math.sin(base * 1.3) * 10)}%`],
          [" Consumption", `${(1.8 + Math.random() * 0.4).toFixed(1)} kW`],
          [" Grid Export", `${(1.2 + Math.max(0, Math.sin(base))).toFixed(1)} kW`],
          [" CO₂ Saved", `${Math.round(3200 + tick * 0.5)} kg`],
          [" Cost Savings", `${Math.round(12400 + tick * 10).toLocaleString()} kr`],
        ];
      case "smart_bench":
        return [
          [" Solar", `${(0.12 + Math.random() * 0.03).toFixed(2)} kW`],
          [" Battery", `${Math.round(92 + Math.random() * 8)}%`],
          [" USB Usage", `${(2.1 + Math.random() * 0.6).toFixed(1)}A`],
          [" WiFi Users", `${Math.floor(8 + Math.random() * 4)}`],
          [" Temp", `${Math.round(22 + Math.random() * 3)}°C`],
        ];
      case "bus_shelter":
        return [
          [" Solar", `${(0.35 + Math.random() * 0.08).toFixed(2)} kW`],
          [" Battery", `${Math.round(85 + Math.random() * 10)}%`],
          [" WiFi Users", `${Math.floor(15 + Math.random() * 5)}`],
          [" Air Quality", `${Math.floor(42 + Math.random() * 15)} AQI`],
          [" Charging", `${Math.floor(3 + Math.random())}/4 ports`],
        ];
      case "battery_storage":
        return [
          [" Capacity", "500 kWh"],
          [" Current Charge", `${Math.round(420 + Math.random() * 40)} kWh`],
          [" Available", `${Math.round(380 + Math.random() * 50)} kWh`],
          [" Backup Time", `${(8.5 + Math.random() * 2).toFixed(1)} hrs`],
          [" Health", `${Math.floor(96 + Math.random() * 3)}%`],
        ];
      case "solar_light":
        return [
          [" Solar", `${(0.08 + Math.random() * 0.02).toFixed(2)} kW`],
          [" Battery", `${Math.round(95 + Math.random() * 5)}%`],
          [" Brightness", `${Math.floor(80 + Math.random() * 15)}%`],
          [" Runtime", `${(10.5 + Math.random() * 2).toFixed(1)}h`],
        ];
      case "ev_charger":
        return [
          [" Power", `${(22 + Math.random() * 5).toFixed(1)} kW`],
          [" Sessions", `${Math.floor(12 + Math.random() * 5)}/day`],
          [" Delivered", `${Math.round(340 + Math.random() * 60)} kWh`],
          [" CO₂ Saved", `${Math.round(120 + Math.random() * 20)} kg`],
        ];
      case "school":
        return [
          [" Solar", `${(12 + Math.random() * 3).toFixed(1)} kW`],
          [" Consumption", `${(25 + Math.random() * 5).toFixed(1)} kW`],
          [" Occupancy", `${Math.floor(420 + Math.random() * 30)}`],
          [" CO₂ Saved", `${Math.round(8500 + Math.random() * 500)} kg`],
        ];
      case "hospital":
        return [
          [" Solar", `${(18 + Math.random() * 4).toFixed(1)} kW`],
          [" Consumption", `${(65 + Math.random() * 10).toFixed(1)} kW`],
          ["🆘 Backup Power", `${Math.round(92 + Math.random() * 5)}%`],
          [" CO₂ Saved", `${Math.round(14000 + Math.random() * 800)} kg`],
        ];
      default:
        return [
          ["ℹ Info", "Select for details"],
        ];
    }
  }, [tick, obj.typeId]);

  return (
    <div className="afercity-popup p-1 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{t.icon}</span>
        <div>
          <strong className="text-gray-900">{obj.name}</strong>
          <p className="text-[10px] text-gray-500">{t.label} · {obj.lat.toFixed(5)}, {obj.lng.toFixed(5)}</p>
        </div>
      </div>
      <hr className="my-1.5 border-gray-100" />
      <div className="space-y-1 text-xs">
        {metrics.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Place preview ────────────────────────────────────────────────────────
function PlacePreview({
  lat,
  lng,
  typeId,
  isValid,
}: {
  lat: number;
  lng: number;
  typeId: ObjectTypeId;
  isValid: boolean;
}) {
  const t = OBJECT_TYPES.find((tp) => tp.id === typeId)!;

  if (typeId === "solar_light" || typeId === "ev_charger") {
    return (
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{
          color: isValid ? "#10b981" : "#ef4444",
          fillColor: isValid ? "#10b981" : "#ef4444",
          fillOpacity: 0.4,
          weight: 2,
          dashArray: isValid ? "" : "4 4",
        }}
        interactive={false}
      />
    );
  }

  const { w, h } = getObjectSizeMeters(typeId);
  const halfLat = metersToDeg(h / 2, lat);
  const halfLng = metersToDegLng(w / 2, lat);

  return (
    <Rectangle
      bounds={[
        [lat - halfLat, lng - halfLng],
        [lat + halfLat, lng + halfLng],
      ]}
      pathOptions={{
        color: isValid ? "#10b981" : "#ef4444",
        fillColor: isValid ? "#10b981" : "#ef4444",
        fillOpacity: 0.2,
        weight: 2,
        dashArray: isValid ? "8 4" : "4 4",
      }}
      interactive={false}
    />
  );
}

// ── Main Map Component ───────────────────────────────────────────────────
export interface AferCityMapProps {
  objects: PlacedObject[];
  selectedObjId: string | null;
  activePlaceType: ObjectTypeId | null;
  cityName: string;
  tileLayer: string;
  onPlaceObject: (lat: number, lng: number) => void;
  onSelectObject: (obj: PlacedObject) => void;
  onObjectClick: (obj: PlacedObject) => void;
}

function AferCityMapInner({
  objects,
  selectedObjId,
  activePlaceType,
  cityName,
  tileLayer,
  onPlaceObject,
  onSelectObject,
  onObjectClick,
}: AferCityMapProps) {
  const city = CITY_LOCATIONS[cityName] || CITY_LOCATIONS["Oslo"];
  const [hoverLat, setHoverLat] = useState<number | null>(null);
  const [hoverLng, setHoverLng] = useState<number | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [isValidPlace, setIsValidPlace] = useState(true);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (activePlaceType) {
        const [snapLat, snapLng] = snapToGrid(lat, lng);
        onPlaceObject(snapLat, snapLng);
        setIsValidPlace(true);
        setHoverLat(null);
        setHoverLng(null);
      }
    },
    [activePlaceType, onPlaceObject]
  );

  // Use useMapEvents in a child for hover tracking
  function HoverHandler() {
    useMapEvents({
      mousemove(e) {
        if (activePlaceType) {
          const [snapLat, snapLng] = snapToGrid(e.latlng.lat, e.latlng.lng);
          setHoverLat(snapLat);
          setHoverLng(snapLng);

          // Check collision
          const collides = checkCollision(snapLat, snapLng, activePlaceType, objects);
          setIsValidPlace(!collides);
        } else {
          setHoverLat(null);
          setHoverLng(null);
        }
      },
      mouseout() {
        if (activePlaceType) {
          // Keep preview visible but no hover
        }
      },
    });
    return null;
  }

  // Fit city to all objects
  const fitCityBounds = useCallback(() => {
    // This is handled by the FitCityButton via map ref
  }, []);

  const tileUrl = TILE_LAYERS[tileLayer]?.url || TILE_LAYERS.standard.url;
  const tileAttr = TILE_LAYERS[tileLayer]?.attribution || TILE_LAYERS.standard.attribution;

  return (
    <MapContainer
      center={[city.lat, city.lng]}
      zoom={city.zoom}
      className="h-full w-full z-0"
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <StyleInjector />
      <TileLayer attribution={tileAttr} url={tileUrl} />
      <MapRecenter center={[city.lat, city.lng]} zoom={city.zoom} />
      <MapResizer />
      <GridOverlay bounds={mapBounds} />
      <MapClickHandler onMapClick={handleMapClick} />
      <HoverHandler />

      <MapObjectLayer
        objects={objects}
        selectedObjId={selectedObjId}
        onSelectObject={onSelectObject}
        onObjectClick={onObjectClick}
      />

      {/* Place preview */}
      {activePlaceType && hoverLat !== null && hoverLng !== null && (
        <PlacePreview
          lat={hoverLat}
          lng={hoverLng}
          typeId={activePlaceType}
          isValid={isValidPlace}
        />
      )}
    </MapContainer>
  );
}

// ── Exported wrapper ──────────────────────────────────────────────────────
export default function AferCityMap(props: AferCityMapProps) {
  return <AferCityMapInner {...props} />;
}

// ── Collision detection ──────────────────────────────────────────────────
function checkCollision(
  lat: number,
  lng: number,
  typeId: ObjectTypeId,
  objects: PlacedObject[]
): boolean {
  if (typeId === "road") return false; // Roads can overlap

  const { w: newW, h: newH } = getObjectSizeMeters(typeId);
  const newHalfLat = metersToDeg(newH / 2, lat);
  const newHalfLng = metersToDegLng(newW / 2, lat);

  const nMinLat = lat - newHalfLat;
  const nMaxLat = lat + newHalfLat;
  const nMinLng = lng - newHalfLng;
  const nMaxLng = lng + newHalfLng;

  for (const obj of objects) {
    if (obj.typeId === "road") continue;
    const { w, h } = getObjectSizeMeters(obj.typeId);
    const halfLat = metersToDeg(h / 2, obj.lat);
    const halfLng = metersToDegLng(w / 2, obj.lat);

    const oMinLat = obj.lat - halfLat;
    const oMaxLat = obj.lat + halfLat;
    const oMinLng = obj.lng - halfLng;
    const oMaxLng = obj.lng + halfLng;

    if (nMinLat < oMaxLat && nMaxLat > oMinLat && nMinLng < oMaxLng && nMaxLng > oMinLng) {
      return true;
    }
  }
  return false;
}

// ── Demo city generator ──────────────────────────────────────────────────
export function createDemoCity(centerLat: number, centerLng: number): PlacedObject[] {
  const objs: PlacedObject[] = [];
  let id = 1;

  const mToLat = (m: number) => m / 111320;
  const mToLng = (m: number) => m / (111320 * Math.cos((centerLat * Math.PI) / 180));

  const add = (typeId: ObjectTypeId, offsetLatM: number, offsetLngM: number, name?: string) => {
    const t = OBJECT_TYPES.find((o) => o.id === typeId)!;
    const [lat, lng] = snapToGrid(
      centerLat + mToLat(offsetLatM),
      centerLng + mToLng(offsetLngM)
    );
    objs.push({
      id: String(id++),
      typeId,
      lat,
      lng,
      name: name || t.label,
    });
  };

  const addRoad = (points: [number, number][], name?: string) => {
    objs.push({
      id: String(id++),
      typeId: "road",
      lat: points[0][0],
      lng: points[0][1],
      name: name || "Road",
      roadPoints: points,
    });
  };

  // Container houses row
  add("container_house", -60, -80, "Zongosol Home 1");
  add("container_house", -60, -40, "Zongosol Home 2");
  add("container_house", -60, 0, "Zongosol Home 3");
  add("container_house", -60, 40, "Zongosol Home 4");

  // Community buildings
  add("school", 50, -80, "AFER Elementary");
  add("hospital", 50, 0, "City General Hospital");
  add("industry", 50, 80, "Tech Campus");

  // Energy infrastructure
  add("battery_storage", -20, 100, "Utility Battery 1");
  add("ev_charger", -80, 100, "EV Station 1");
  add("ev_charger", -40, 100, "EV Station 2");

  // Street lights along a road
  for (let i = 0; i < 6; i++) {
    add("solar_light", -120, -100 + i * 30);
  }

  // Smart benches
  add("smart_bench", -100, -60, "Park Bench 1");
  add("smart_bench", -100, 0, "Park Bench 2");
  add("smart_bench", -100, 60, "Park Bench 3");

  // Bus shelters
  add("bus_shelter", 100, -60, "Main St. Shelter");
  add("bus_shelter", 100, 60, "Park Ave. Shelter");

  // Parks
  add("park", 0, -120, "Central Park");
  add("park", -80, 120, "Community Garden");

  // Parking
  add("parking", 100, 100, "Public Parking");

  // Roads
  const roadLat = (m: number) => centerLat + mToLat(m);
  const roadLng = (m: number) => centerLng + mToLng(m);

  addRoad([
    [roadLat(-140), roadLng(-140)],
    [roadLat(-140), roadLng(140)],
  ], "Main Street");

  addRoad([
    [roadLat(140), roadLng(-140)],
    [roadLat(140), roadLng(140)],
  ], "East Road");

  addRoad([
    [roadLat(-140), roadLng(0)],
    [roadLat(140), roadLng(0)],
  ], "Center Ave");

  return objs;
}
