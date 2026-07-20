import { useRef, useState, useCallback } from "react";

// ── Types (imported from zongosol) ─────────────────────
type RoomType = "kitchen" | "bathroom" | "living" | "bedroom";
type ContainerSize = "20ft" | "40ft" | "double" | "custom";
type ExteriorColor = "wood" | "metal" | "white" | "green" | "charcoal";
type KitchenLayout = "L-shape" | "galley" | "island";
type KitchenBrand = "ikea" | "hth" | "epoq" | "custom";
type CountertopMaterial = "wood" | "granite" | "marble" | "laminate" | "steel";
type KitchenAppliance = "refrigerator" | "oven" | "dishwasher" | "microwave" | "cooktop";
type BathFixture = "shower" | "tub" | "double-sink" | "toilet" | "bidet";
type LivingItem = "sofa-3" | "sofa-2" | "sectional" | "coffee-table" | "tv-unit" | "dining-4" | "dining-6" | "bookshelf";
type BedroomItem = "bed-double" | "bed-queen" | "bed-single" | "wardrobe" | "nightstand" | "desk";
type SmartHomeType = "none" | "knx" | "zigbee";
type Wall = "top" | "bottom" | "left" | "right";
type LayoutType = "single" | "side-by-side" | "l-shape" | "u-shape" | "stacked";

interface Window_ { id: string; wall: Wall; position: number; }
interface Door_ { id: string; wall: Wall; position: number; }
interface RoomDef { id: string; type: RoomType; label: string; }

interface DesignState {
  selectedModel: string | null;
  containerSize: ContainerSize;
  customLength: number;
  customWidth: number;
  rooms: RoomDef[];
  windows: Window_[];
  doors: Door_[];
  exteriorColor: ExteriorColor;
  solarPanels: boolean;
  deck: boolean;
  kitchenLayout: KitchenLayout;
  kitchenBrand: KitchenBrand;
  kitchenCountertop: CountertopMaterial;
  kitchenAppliances: KitchenAppliance[];
  bathFixtures: BathFixture[];
  livingItems: LivingItem[];
  bedroomItems: BedroomItem[];
  electricalOutlets: number;
  electricalLights: number;
  smartHome: SmartHomeType;
  evCharger: boolean;
  layoutType: LayoutType;
  stairs: boolean;
  balcony: boolean;
  roofTerrace: boolean;
  panelType?: string;
  batterySize?: string;
  inverterType?: string;
  windTurbine?: boolean;
  windTurbineSize?: string;
  heatPumpType?: string;
  evChargerPower?: string;
}

interface Container3DHandle {
  captureView: (preset: string) => string | null;
  getCanvas: () => HTMLCanvasElement | null;
}

// ── Labels / maps ───────────────────────────────────────
const EXTERIOR_LABELS: Record<ExteriorColor, string> = {
  wood: "Natural Wood", metal: "Brushed Metal", white: "Classic White", green: "Forest Green", charcoal: "Charcoal",
};
const LIVING_LABELS: Record<LivingItem, string> = { "sofa-3": "3-Seat Sofa", "sofa-2": "2-Seat Sofa", sectional: "Sectional", "coffee-table": "Coffee Table", "tv-unit": "TV Unit", "dining-4": "Dining (4-seat)", "dining-6": "Dining (6-seat)", bookshelf: "Bookshelf" };
const BEDROOM_LABELS: Record<BedroomItem, string> = { "bed-double": "Double Bed", "bed-queen": "Queen Bed", "bed-single": "Single Bed", wardrobe: "Wardrobe", nightstand: "Nightstand", desk: "Desk" };
const ROOM_SVG: Record<RoomType, { fill: string; stroke: string }> = {
  kitchen: { fill: "#fff7ed", stroke: "#f97316" },
  bathroom: { fill: "#eff6ff", stroke: "#3b82f6" },
  living: { fill: "#f0fdf4", stroke: "#22c55e" },
  bedroom: { fill: "#faf5ff", stroke: "#a855f7" },
};
const FURNITURE_LAYOUTS: Record<string, { x: number; y: number; w: number; h: number; label: string }[]> = {
  "sofa-3": [{ x: 20, y: 30, w: 40, h: 16, label: "Sofa" }],
  "sofa-2": [{ x: 20, y: 30, w: 30, h: 16, label: "Sofa" }],
  sectional: [{ x: 15, y: 25, w: 35, h: 30, label: "Sectional" }],
  "coffee-table": [{ x: 35, y: 55, w: 18, h: 12, label: "Coffee Tbl" }],
  "tv-unit": [{ x: 25, y: 75, w: 30, h: 8, label: "TV Unit" }],
  "dining-4": [{ x: 20, y: 15, w: 28, h: 20, label: "Dining" }],
  "dining-6": [{ x: 15, y: 10, w: 35, h: 25, label: "Dining" }],
  bookshelf: [{ x: 80, y: 20, w: 8, h: 30, label: "Shelf" }],
  "bed-double": [{ x: 20, y: 20, w: 38, h: 28, label: "Double Bed" }],
  "bed-queen": [{ x: 15, y: 15, w: 40, h: 32, label: "Queen Bed" }],
  "bed-single": [{ x: 25, y: 25, w: 30, h: 20, label: "Single Bed" }],
  wardrobe: [{ x: 75, y: 15, w: 12, h: 35, label: "Wardrobe" }],
  nightstand: [{ x: 65, y: 15, w: 8, h: 10, label: "Stand" }],
  desk: [{ x: 60, y: 50, w: 22, h: 14, label: "Desk" }],
};

// ── Helper: container dimensions ────────────────────────
function getDimsFt(state: DesignState): { lengthFt: number; widthFt: number; heightFt: number } {
  let l = 20, w = 8;
  if (state.containerSize === "40ft") { l = 40; w = 8; }
  else if (state.containerSize === "double") { l = 40; w = 16; }
  else if (state.containerSize === "custom") { l = state.customLength; w = state.customWidth; }
  return { lengthFt: l, widthFt: w, heightFt: 8.5 };
}

// ── Helper: room layout ─────────────────────────────────
function getRoomLayout(rooms: RoomDef[], containerSize: ContainerSize, customW: number, customL: number) {
  const H = containerSize === "40ft" ? 400 : containerSize === "double" ? 260 : containerSize === "custom" ? (customL / customW) * 120 : 240;
  const W = containerSize === "double" ? 200 : 120;
  const pad = 10;
  const usableH = H - pad * 2;
  const usableW = W - pad * 2;
  if (rooms.length <= 3) {
    return rooms.map((room, i) => {
      const segH = usableH / rooms.length;
      return { x: pad, y: pad + i * segH, w: usableW, h: segH, room };
    });
  }
  if (rooms.length === 5) {
    const halfW = usableW / 2;
    return rooms.map((room, i) => {
      if (i < 2) return { x: pad + (i % 2) * halfW, y: pad, w: halfW, h: usableH * 0.22, room };
      if (i === 2) return { x: pad, y: pad + usableH * 0.22, w: usableW, h: usableH * 0.28, room };
      const idx = i - 3;
      return { x: pad + idx * halfW, y: pad + usableH * 0.50, w: halfW, h: usableH * 0.50, room };
    });
  }
  if (rooms.length >= 7) {
    const thirdW = usableW / 3;
    const thirdH = usableH / 3;
    return rooms.map((room, i) => ({
      x: pad + (i % 3) * thirdW, y: pad + Math.floor(i / 3) * thirdH, w: thirdW, h: thirdH, room,
    }));
  }
  const segH = usableH / rooms.length;
  return rooms.map((room, i) => ({ x: pad, y: pad + i * segH, w: usableW, h: segH, room }));
}

// ── Helper: total area ──────────────────────────────────
function getTotalArea(state: DesignState): number {
  const { lengthFt, widthFt } = getDimsFt(state);
  const count = state.layoutType === "stacked" ? 2 : state.layoutType === "u-shape" ? 3 : state.layoutType === "l-shape" || state.layoutType === "side-by-side" ? 2 : 1;
  return Math.round(lengthFt * widthFt * count * 0.0929); // ft² → m²
}

// ── Helper: solar panels ────────────────────────────────
function getSolarData(state: DesignState): { panels: number; kwp: number } {
  if (!state.solarPanels) return { panels: 0, kwp: 0 };
  const { lengthFt, widthFt } = getDimsFt(state);
  const roofM2 = lengthFt * widthFt * 0.0929 * 0.85;
  const panels = Math.max(1, Math.floor(roofM2 / 1.7));
  return { panels, kwp: Math.round(panels * 0.4 * 10) / 10 };
}

// ── Helper: price calc (simplified) ─────────────────────
function calcTotalSimple(state: DesignState): number {
  let t = 0;
  if (state.containerSize === "20ft") t = 45000;
  else if (state.containerSize === "40ft") t = 85000;
  else if (state.containerSize === "double") t = 145000;
  else t = 60000;
  t += state.windows.length * 800;
  t += state.doors.length * 600;
  t += state.solarPanels ? 15000 : 0;
  t += state.deck ? 8000 : 0;
  t += state.stairs ? 5000 : 0;
  t += state.balcony ? 6000 : 0;
  t += state.roofTerrace ? 7500 : 0;
  t += state.evCharger ? 8000 : 0;
  t += state.electricalOutlets * 500;
  t += state.electricalLights * 1500;
  t += state.smartHome === "knx" ? 15000 : state.smartHome === "zigbee" ? 8000 : 0;
  return t;
}

// ── Wall mapping ────────────────────────────────────────
const WALL_LABEL: Record<Wall, string> = { top: "Rear", bottom: "Front", left: "Left", right: "Right" };

// ══════════════════════════════════════════════════════════
// DOCUMENTATION PANEL (print-friendly)
// ══════════════════════════════════════════════════════════

export default function DocumentationPanel({
  state,
  container3DRef,
}: {
  state: DesignState;
  container3DRef: React.RefObject<Container3DHandle | null>;
}) {
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [capturing, setCapturing] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  // 3D capture
  const handleCapture = useCallback((preset: string) => {
    if (!container3DRef.current) return;
    setCapturing(true);
    // Small delay to ensure renderer is ready
    setTimeout(() => {
      const dataUrl = container3DRef.current?.captureView(preset);
      if (dataUrl) {
        setCaptures((prev) => ({ ...prev, [preset]: dataUrl }));
      }
      setCapturing(false);
    }, 100);
  }, [container3DRef]);

  const handleCaptureAll = useCallback(() => {
    const presets = ["front", "back", "top", "bird"];
    presets.forEach((p, i) => {
      setTimeout(() => handleCapture(p), i * 200);
    });
  }, [handleCapture]);

  // PDF export
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!state.selectedModel) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center px-6">
          <p className="text-sm font-medium">Select a container model first</p>
          <p className="text-xs mt-1 text-gray-400">Documentation will appear here</p>
        </div>
      </div>
    );
  }

  const dims = getDimsFt(state);
  const area = getTotalArea(state);
  const solar = getSolarData(state);
  const total = calcTotalSimple(state);
  const modelName = state.selectedModel ? state.selectedModel.charAt(0).toUpperCase() + state.selectedModel.slice(1) : "Custom";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Layout for SVG floor plan
  const layout = getRoomLayout(state.rooms, state.containerSize, dims.widthFt, dims.lengthFt);
  const svgH = state.containerSize === "40ft" ? 400 : state.containerSize === "double" ? 260 : state.containerSize === "custom" ? (dims.lengthFt / dims.widthFt) * 120 : 240;
  const svgW = state.containerSize === "double" ? 200 : 120;

  // ── Room type counts for door/window schedule ────────
  const roomsByType: Record<RoomType, RoomDef[]> = { kitchen: [], bathroom: [], living: [], bedroom: [] };
  state.rooms.forEach((r) => roomsByType[r.type].push(r));

  return (
    <div ref={docRef} className="documentation-panel">
      {/* ── Controls ─────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <button onClick={handlePrint}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
        > Export as PDF</button>
        <button onClick={handleCaptureAll}
          disabled={capturing}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-50"
        > {capturing ? "Capturing..." : "Capture All 3D Views"}</button>
        <button onClick={() => handleCapture("front")}
          disabled={capturing}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
        > Front</button>
        <button onClick={() => handleCapture("back")}
          disabled={capturing}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
        > Back</button>
        <button onClick={() => handleCapture("top")}
          disabled={capturing}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
        > Top</button>
        <button onClick={() => handleCapture("bird")}
          disabled={capturing}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
        > Bird&apos;s Eye</button>
      </div>

      {/* ═══════════════════════════════════════════════════
           PAGE 1: PROJECT SUMMARY
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white text-lg font-bold">K</div>
            <h1 className="text-2xl font-extrabold text-gray-900">Kitozon Container Home</h1>
          </div>
          <h2 className="text-lg font-bold text-emerald-700 mt-1">Project Documentation</h2>
          <p className="text-sm text-gray-500 mt-1">Date: {today}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Summary</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Project Name</td><td className="py-1.5 font-medium text-gray-800">{modelName} Container Home</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Container Type</td><td className="py-1.5 font-medium text-gray-800">{state.containerSize === "20ft" ? "20ft (6.1m)" : state.containerSize === "40ft" ? "40ft (12.2m)" : state.containerSize === "double" ? "Double-Wide (2×40ft)" : `Custom (${dims.lengthFt}ft × ${dims.widthFt}ft)`}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Layout</td><td className="py-1.5 font-medium text-gray-800 capitalize">{state.layoutType.replace("-", " ")}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Container Count</td><td className="py-1.5 font-medium text-gray-800">{state.layoutType === "stacked" ? 2 : state.layoutType === "u-shape" ? 3 : state.layoutType === "l-shape" || state.layoutType === "side-by-side" ? 2 : 1}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Total Area</td><td className="py-1.5 font-medium text-gray-800">{area} m² ({dims.lengthFt * dims.widthFt * (state.layoutType === "stacked" ? 2 : state.layoutType === "u-shape" ? 3 : state.layoutType === "l-shape" || state.layoutType === "side-by-side" ? 2 : 1)} ft²)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Rooms</td><td className="py-1.5 font-medium text-gray-800">{state.rooms.length}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Estimated Price</td><td className="py-1.5 font-bold text-emerald-700">${total.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Energy &amp; Sustainability</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Solar Panels</td><td className="py-1.5 font-medium text-gray-800">{solar.panels} panels ({solar.kwp} kWp)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Battery Storage</td><td className="py-1.5 font-medium text-gray-800">{state.batterySize && state.batterySize !== "none" ? `${state.batterySize} kWh` : "None"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Heat Pump</td><td className="py-1.5 font-medium text-gray-800">{state.heatPumpType && state.heatPumpType !== "none" ? state.heatPumpType : "None"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">EV Charger</td><td className="py-1.5 font-medium text-gray-800">{state.evCharger ? `Yes (${state.evChargerPower || "7.4"} kW)` : "No"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500">Smart Home</td><td className="py-1.5 font-medium text-gray-800">{state.smartHome === "none" ? "None" : state.smartHome.toUpperCase()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-500">Generated by <span className="font-semibold text-emerald-700">Kitozon Smart Container Designer</span> — {today}</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           FLOOR PLAN DRAWING
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <span></span> Floor Plan — {modelName} Container Home
        </h2>
        <p className="text-xs text-gray-500 mb-4">Date: {today} | Dimensions in feet</p>
        <div className="flex justify-center bg-[#f8fafc] rounded-lg p-4">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-2xl" style={{ maxHeight: "600px" }}>
            <defs>
              <pattern id="docGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={svgW} height={svgH} fill="url(#docGrid)" rx="2" />
            {/* Container outline with wall thickness */}
            <rect x="2" y="2" width={svgW - 4} height={svgH - 4} fill="none" stroke="#475569" strokeWidth="4" rx="3" />
            <rect x="6" y="6" width={svgW - 12} height={svgH - 12} fill="none" stroke="#94a3b8" strokeWidth="1.5" rx="2" strokeDasharray="6 4" />
            {/* Rooms */}
            {layout.map(({ x, y, w, h, room }) => (
              <g key={room.id}>
                <rect x={x} y={y} width={w} height={h} fill={ROOM_SVG[room.type].fill} stroke={ROOM_SVG[room.type].stroke} strokeWidth="1.5" rx="2" />
                <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={ROOM_SVG[room.type].stroke} fontFamily="system-ui, sans-serif">{room.label}</text>
                <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="#94a3b8" fontFamily="system-ui, sans-serif">
                  {Math.round(w / svgW * dims.lengthFt)}&apos; × {Math.round(h / svgH * (dims.lengthFt > 20 ? dims.widthFt : dims.lengthFt * 0.6))}&apos;
                </text>
              </g>
            ))}
            {/* Windows */}
            {state.windows.map((win, i) => {
              let wx: number, wy: number, ww: number, wh: number;
              const ws = 10;
              if (win.wall === "top") { wx = 6 + (svgW - 12) * (win.position / 100) - ws / 2; wy = 3; ww = ws; wh = 2; }
              else if (win.wall === "bottom") { wx = 6 + (svgW - 12) * (win.position / 100) - ws / 2; wy = svgH - 5; ww = ws; wh = 2; }
              else if (win.wall === "left") { wx = 3; wy = 6 + (svgH - 12) * (win.position / 100) - ws / 2; ww = 2; wh = ws; }
              else { wx = svgW - 5; wy = 6 + (svgH - 12) * (win.position / 100) - ws / 2; ww = 2; wh = ws; }
              return <rect key={win.id} x={wx} y={wy} width={ww} height={wh} fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" rx="1" />;
            })}
            {/* Doors */}
            {state.doors.map((door) => {
              let dx: number, dy: number, dw: number, dh: number;
              const ds = 8;
              if (door.wall === "top") { dx = 6 + (svgW - 12) * (door.position / 100) - ds / 2; dy = 3; dw = ds; dh = 2; }
              else if (door.wall === "bottom") { dx = 6 + (svgW - 12) * (door.position / 100) - ds / 2; dy = svgH - 5; dw = ds; dh = 2; }
              else if (door.wall === "left") { dx = 3; dy = 6 + (svgH - 12) * (door.position / 100) - ds / 2; dw = 2; dh = ds; }
              else { dx = svgW - 5; dy = 6 + (svgH - 12) * (door.position / 100) - ds / 2; dw = 2; dh = ds; }
              return <rect key={door.id} x={dx} y={dy} width={dw} height={dh} fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" rx="1" />;
            })}
            {/* Furniture */}
            {state.rooms.map((room) => {
              const roomLayout = layout.find((l) => l.room.id === room.id);
              if (!roomLayout) return null;
              const items = room.type === "living" ? state.livingItems : room.type === "bedroom" ? state.bedroomItems : [];
              return items.flatMap((item, idx) => {
                const placements = FURNITURE_LAYOUTS[item];
                if (!placements) return null;
                return placements.map((p, pi) => {
                  const fx = roomLayout.x + (p.x / 100) * roomLayout.w;
                  const fy = roomLayout.y + (p.y / 100) * roomLayout.h;
                  const fw = (p.w / 100) * roomLayout.w;
                  const fh = (p.h / 100) * roomLayout.h;
                  return (
                    <g key={`${room.id}-${item}-${pi}`}>
                      <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="#6b7280" strokeWidth="0.5" rx="1" strokeDasharray="2 1" />
                      <text x={fx + fw / 2} y={fy + fh / 2} textAnchor="middle" dominantBaseline="middle" fontSize="3.5" fill="#6b7280" fontFamily="system-ui, sans-serif">{p.label}</text>
                    </g>
                  );
                });
              });
            })}
            {/* Scale bar */}
            <g transform={`translate(${svgW - 45}, ${svgH - 20})`}>
              <line x1="0" y1="0" x2="40" y2="0" stroke="#475569" strokeWidth="1.5" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#475569" strokeWidth="1" />
              <line x1="20" y1="-3" x2="20" y2="3" stroke="#475569" strokeWidth="1" />
              <line x1="40" y1="-3" x2="40" y2="3" stroke="#475569" strokeWidth="1" />
              <text x="0" y="8" textAnchor="middle" fontSize="5" fill="#475569" fontFamily="system-ui, sans-serif">0</text>
              <text x="20" y="8" textAnchor="middle" fontSize="5" fill="#475569" fontFamily="system-ui, sans-serif">{(dims.lengthFt / 2).toFixed(0)}ft</text>
              <text x="40" y="8" textAnchor="middle" fontSize="5" fill="#475569" fontFamily="system-ui, sans-serif">{dims.lengthFt}ft</text>
              <text x="20" y="-6" textAnchor="middle" fontSize="4" fill="#94a3b8" fontFamily="system-ui, sans-serif">SCALE</text>
            </g>
            {/* Dimensions */}
            <text x={svgW / 2} y={svgH - 10} textAnchor="middle" fontSize="5" fill="#64748b" fontFamily="system-ui, sans-serif">{dims.lengthFt} ft</text>
            <text x={svgW - 10} y={svgH / 2} textAnchor="middle" fontSize="5" fill="#64748b" fontFamily="system-ui, sans-serif" transform={`rotate(-90, ${svgW - 10}, ${svgH / 2})`}>{dims.widthFt} ft</text>
            {/* Title block */}
            <text x={svgW / 2} y="14" textAnchor="middle" fontSize="7" fontWeight="700" fill="#334155" fontFamily="system-ui, sans-serif">Kitozon Container Home — Floor Plan</text>
          </svg>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {(["kitchen", "bathroom", "living", "bedroom"] as RoomType[]).map((type) => (
            <span key={type} className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ROOM_SVG[type].fill, border: `1px solid ${ROOM_SVG[type].stroke}` }} />{type}</span>
          ))}
          <span className="flex items-center gap-1 ml-2"><span className="inline-block w-3 h-3 rounded-sm bg-sky-400 border border-sky-600" />Window</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-400 border border-red-600" />Door</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 border border-gray-400 border-dashed" />Furniture</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           FACADE DRAWING (Front Elevation)
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <span></span> Front Elevation — {modelName}
        </h2>
        <p className="text-xs text-gray-500 mb-4">Date: {today}</p>
        <div className="flex justify-center bg-[#f8fafc] rounded-lg p-4">
          <svg viewBox="0 0 400 250" className="w-full max-w-2xl" style={{ maxHeight: "400px" }}>
            <defs>
              {/* Corrugated pattern */}
              <pattern id="corrugated" width="4" height="8" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="2" height="8" fill="#d4d4d4" />
                <rect x="2" y="0" width="2" height="8" fill="#b0b0b0" />
              </pattern>
              <pattern id="corrugatedColored" width="4" height="8" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="2" height="8" fill={state.exteriorColor === "wood" ? "#9B7653" : state.exteriorColor === "metal" ? "#a8b2bd" : state.exteriorColor === "green" ? "#3d6b35" : state.exteriorColor === "charcoal" ? "#555" : "#e8e8e0"} />
                <rect x="2" y="0" width="2" height="8" fill={state.exteriorColor === "wood" ? "#7d5e3f" : state.exteriorColor === "metal" ? "#8f99a3" : state.exteriorColor === "green" ? "#2f5428" : state.exteriorColor === "charcoal" ? "#444" : "#ccc"} />
              </pattern>
            </defs>
            {/* Ground line */}
            <line x1="20" y1="210" x2="380" y2="210" stroke="#94a3b8" strokeWidth="1" />
            {/* Container body */}
            <rect x="60" y="50" width="280" height="160" fill="url(#corrugatedColored)" stroke="#475569" strokeWidth="2" rx="2" />
            {/* Container corners */}
            <rect x="55" y="45" width="10" height="10" fill="#64748b" rx="1" />
            <rect x="335" y="45" width="10" height="10" fill="#64748b" rx="1" />
            <rect x="55" y="205" width="10" height="10" fill="#64748b" rx="1" />
            <rect x="335" y="205" width="10" height="10" fill="#64748b" rx="1" />
            {/* Roof line */}
            <rect x="58" y="42" width="284" height="10" fill="#334155" stroke="#1e293b" strokeWidth="1" rx="2" />
            {/* Solar panels */}
            {state.solarPanels && (
              <>
                <rect x="65" y="32" width="270" height="12" fill="#1a237e" stroke="#0d1b5e" strokeWidth="0.5" rx="1" opacity="0.9" />
                <line x1="130" y1="32" x2="130" y2="44" stroke="#0d1b5e" strokeWidth="0.5" />
                <line x1="200" y1="32" x2="200" y2="44" stroke="#0d1b5e" strokeWidth="0.5" />
                <line x1="270" y1="32" x2="270" y2="44" stroke="#0d1b5e" strokeWidth="0.5" />
                <text x="200" y="28" textAnchor="middle" fontSize="6" fill="#1a237e" fontWeight="600"> Solar Panels ({solar.panels}×)</text>
              </>
            )}
            {/* Windows on front (bottom wall) */}
            {state.windows.filter(w => w.wall === "bottom").map((win, i) => {
              const wx = 60 + 280 * (win.position / 100) - 20;
              const allFront = state.windows.filter(w => w.wall === "bottom");
              const wy = 80 + (allFront.indexOf(win) % 3) * 50;
              return (
                <g key={win.id}>
                  <rect x={wx} y={wy} width={40} height={30} fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" rx="1" />
                  <line x1={wx + 20} y1={wy} x2={wx + 20} y2={wy + 30} stroke="#0284c7" strokeWidth="0.8" />
                  <line x1={wx} y1={wy + 15} x2={wx + 40} y2={wy + 15} stroke="#0284c7" strokeWidth="0.8" />
                </g>
              );
            })}
            {/* Door on front */}
            {state.doors.filter(d => d.wall === "bottom").map((door, i) => {
              const dx = 60 + 280 * (door.position / 100) - 15;
              return (
                <g key={door.id}>
                  <rect x={dx} y={140} width={30} height={70} fill="#5C3A1E" stroke="#3E2710" strokeWidth="1.5" rx="1" />
                  <circle cx={dx + 22} cy={175} r="2" fill="#d4a853" />
                </g>
              );
            })}
            {/* Deck */}
            {state.deck && (
              <rect x="40" y="208" width="320" height="8" fill="#b45309" stroke="#92400e" strokeWidth="0.5" rx="1" />
            )}
            {/* Dimensions */}
            <line x1="60" y1="225" x2="340" y2="225" stroke="#475569" strokeWidth="1" />
            <line x1="60" y1="222" x2="60" y2="228" stroke="#475569" strokeWidth="0.8" />
            <line x1="340" y1="222" x2="340" y2="228" stroke="#475569" strokeWidth="0.8" />
            <text x="200" y="238" textAnchor="middle" fontSize="6" fill="#475569">{dims.lengthFt} ft ({Math.round(dims.lengthFt * 0.3048 * 10) / 10} m)</text>
            {/* Height dimension */}
            <line x1="345" y1="42" x2="345" y2="210" stroke="#475569" strokeWidth="1" />
            <line x1="342" y1="42" x2="348" y2="42" stroke="#475569" strokeWidth="0.8" />
            <line x1="342" y1="210" x2="348" y2="210" stroke="#475569" strokeWidth="0.8" />
            <text x="355" y="128" textAnchor="start" fontSize="6" fill="#475569">8.5 ft (2.59m)</text>
            {/* Title */}
            <text x="200" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#334155" fontFamily="system-ui, sans-serif">Kitozon Container Home — Front Elevation</text>
            <text x="200" y="254" textAnchor="middle" fontSize="5" fill="#94a3b8" fontFamily="system-ui, sans-serif">Exterior: {EXTERIOR_LABELS[state.exteriorColor]}</text>
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           3D PERSPECTIVE VIEWS
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span></span> 3D Perspective Views
        </h2>
        <p className="text-xs text-gray-500 mb-4">Use the buttons above to capture 3D views. Captured images appear below and are included in the PDF export.</p>
        {Object.keys(captures).length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400">No captures yet — click &quot;Capture All 3D Views&quot; above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(captures).map(([preset, dataUrl]) => (
              <div key={preset} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 capitalize flex items-center gap-1">
                  <span></span> {preset === "bird" ? "Bird's Eye" : preset} View
                </div>
                <div className="p-2 flex justify-center">
                  <img src={dataUrl} alt={`${preset} view`} className="max-w-full rounded shadow-sm" style={{ maxHeight: "300px" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════
           MATERIAL LIST
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span></span> Material List — {modelName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Category</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Item</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Qty</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Specification</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {/* Structure */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> STRUCTURE</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Shipping Container</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.layoutType === "stacked" ? 2 : state.layoutType === "u-shape" ? 3 : state.layoutType === "l-shape" || state.layoutType === "side-by-side" ? 2 : 1}</td>
                <td className="px-3 py-1.5 text-gray-500">{state.containerSize === "20ft" ? "20ft × 8ft" : state.containerSize === "40ft" ? "40ft × 8ft" : state.containerSize === "double" ? "40ft × 16ft (double)" : `${dims.lengthFt}ft × ${dims.widthFt}ft`}</td>
                <td className="px-3 py-1.5 text-right font-medium">—</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Steel Frame Reinforcement</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.layoutType === "stacked" || state.layoutType === "u-shape" ? 2 : 1}</td>
                <td className="px-3 py-1.5 text-gray-500">Galvanized steel, welded</td>
                <td className="px-3 py-1.5 text-right font-medium">$4,500</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Insulation</td>
                <td className="px-3 py-1.5 text-right font-medium">{Math.round(dims.lengthFt * dims.widthFt * 0.0929 * 6)}</td>
                <td className="px-3 py-1.5 text-gray-500">Spray foam, R30, m² wall+ceiling</td>
                <td className="px-3 py-1.5 text-right font-medium">$6,000</td>
              </tr>
              {/* Exterior */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> EXTERIOR</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Wall Finish</td>
                <td className="px-3 py-1.5 text-right font-medium">{Math.round(dims.lengthFt * dims.widthFt * 0.0929 * 4)}</td>
                <td className="px-3 py-1.5 text-gray-500">{EXTERIOR_LABELS[state.exteriorColor]}, m² exterior</td>
                <td className="px-3 py-1.5 text-right font-medium">${state.exteriorColor === "wood" ? "5,000" : state.exteriorColor === "metal" ? "3,000" : state.exteriorColor === "white" ? "0" : state.exteriorColor === "green" ? "2,000" : "3,500"}</td>
              </tr>
              {/* Roof */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> ROOF</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Roof Membrane</td>
                <td className="px-3 py-1.5 text-right font-medium">{Math.round(dims.lengthFt * dims.widthFt * 0.0929)}</td>
                <td className="px-3 py-1.5 text-gray-500">EPDM rubber, m²</td>
                <td className="px-3 py-1.5 text-right font-medium">$3,500</td>
              </tr>
              {state.solarPanels && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Solar Panels</td>
                  <td className="px-3 py-1.5 text-right font-medium">{solar.panels}</td>
                  <td className="px-3 py-1.5 text-gray-500">{solar.kwp} kWp, {state.panelType || "standard"}</td>
                  <td className="px-3 py-1.5 text-right font-medium">${(solar.panels * 3500).toLocaleString()}</td>
                </tr>
              )}
              {/* Windows & Doors */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> WINDOWS &amp; DOORS</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Windows</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.windows.length}</td>
                <td className="px-3 py-1.5 text-gray-500">Double-glazed, tilt-turn</td>
                <td className="px-3 py-1.5 text-right font-medium">${(state.windows.length * 800).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Doors</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.doors.length}</td>
                <td className="px-3 py-1.5 text-gray-500">Insulated steel</td>
                <td className="px-3 py-1.5 text-right font-medium">${(state.doors.length * 600).toLocaleString()}</td>
              </tr>
              {/* Interior */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> INTERIOR</td></tr>
              {state.rooms.map((room) => {
                const roomArea = Math.round(getTotalArea(state) / state.rooms.length);
                return (
                  <tr key={room.id} className="border-b border-gray-100">
                    <td className="px-3 py-1.5"></td>
                    <td className="px-3 py-1.5 text-gray-700">{room.label} Flooring</td>
                    <td className="px-3 py-1.5 text-right font-medium">{roomArea}</td>
                    <td className="px-3 py-1.5 text-gray-500">{room.type === "bathroom" ? "Ceramic tile" : "Engineered wood"}, m²</td>
                    <td className="px-3 py-1.5 text-right font-medium">${(roomArea * 80).toLocaleString()}</td>
                  </tr>
                );
              })}
              {/* Kitchen */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> KITCHEN</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Kitchen Cabinetry</td>
                <td className="px-3 py-1.5 text-right font-medium">1</td>
                <td className="px-3 py-1.5 text-gray-500">{state.kitchenBrand.toUpperCase()} · {state.kitchenLayout}</td>
                <td className="px-3 py-1.5 text-right font-medium">—</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Countertop</td>
                <td className="px-3 py-1.5 text-right font-medium">1</td>
                <td className="px-3 py-1.5 text-gray-500">{state.kitchenCountertop}</td>
                <td className="px-3 py-1.5 text-right font-medium">—</td>
              </tr>
              {state.kitchenAppliances.map((a) => (
                <tr key={a} className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700 capitalize">{a}</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">Standard</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              ))}
              {/* Bathroom */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> BATHROOM</td></tr>
              {state.bathFixtures.map((f) => (
                <tr key={f} className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700 capitalize">{f.replace("-", " ")}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{roomsByType.bathroom.length}</td>
                  <td className="px-3 py-1.5 text-gray-500">Standard</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              ))}
              {/* Furniture */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> FURNITURE</td></tr>
              {state.livingItems.map((item) => (
                <tr key={item} className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">{LIVING_LABELS[item]}</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">Living Room</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              ))}
              {state.bedroomItems.map((item) => (
                <tr key={item} className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">{BEDROOM_LABELS[item]}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{roomsByType.bedroom.length}</td>
                  <td className="px-3 py-1.5 text-gray-500">Bedroom</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              ))}
              {/* Electrical */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> ELECTRICAL</td></tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Power Outlets</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.electricalOutlets}</td>
                <td className="px-3 py-1.5 text-gray-500">Schuko, IP44 where required</td>
                <td className="px-3 py-1.5 text-right font-medium">${(state.electricalOutlets * 500).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-gray-700">Light Fixtures</td>
                <td className="px-3 py-1.5 text-right font-medium">{state.electricalLights}</td>
                <td className="px-3 py-1.5 text-gray-500">LED recessed</td>
                <td className="px-3 py-1.5 text-right font-medium">${(state.electricalLights * 1500).toLocaleString()}</td>
              </tr>
              {state.smartHome !== "none" && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Smart Home System</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">{state.smartHome.toUpperCase()}</td>
                  <td className="px-3 py-1.5 text-right font-medium">${state.smartHome === "knx" ? "15,000" : "8,000"}</td>
                </tr>
              )}
              {/* Energy */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> ENERGY</td></tr>
              {state.solarPanels && (
                <>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5"></td>
                    <td className="px-3 py-1.5 text-gray-700">Solar Array</td>
                    <td className="px-3 py-1.5 text-right font-medium">{solar.kwp}</td>
                    <td className="px-3 py-1.5 text-gray-500">kWp ({solar.panels} × {state.panelType || "standard"} panels)</td>
                    <td className="px-3 py-1.5 text-right font-medium">${(solar.panels * 3500).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5"></td>
                    <td className="px-3 py-1.5 text-gray-700">Inverter</td>
                    <td className="px-3 py-1.5 text-right font-medium">1</td>
                    <td className="px-3 py-1.5 text-gray-500">{state.inverterType || "string"}</td>
                    <td className="px-3 py-1.5 text-right font-medium">—</td>
                  </tr>
                </>
              )}
              {state.batterySize && state.batterySize !== "none" && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Battery Storage</td>
                  <td className="px-3 py-1.5 text-right font-medium">{state.batterySize}</td>
                  <td className="px-3 py-1.5 text-gray-500">kWh</td>
                  <td className="px-3 py-1.5 text-right font-medium">${(parseInt(state.batterySize) * 5000).toLocaleString()}</td>
                </tr>
              )}
              {state.heatPumpType && state.heatPumpType !== "none" && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Heat Pump</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">{state.heatPumpType}</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              )}
              {state.evCharger && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">EV Charger</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">{state.evChargerPower || "7.4"} kW</td>
                  <td className="px-3 py-1.5 text-right font-medium">$8,000</td>
                </tr>
              )}
              {state.windTurbine && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Wind Turbine</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">{state.windTurbineSize || "1"} kW</td>
                  <td className="px-3 py-1.5 text-right font-medium">—</td>
                </tr>
              )}
              {/* Add-ons */}
              <tr className="bg-gray-50"><td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-gray-600"> ADD-ONS</td></tr>
              {state.deck && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Deck</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">Pressure-treated wood</td>
                  <td className="px-3 py-1.5 text-right font-medium">$8,000</td>
                </tr>
              )}
              {state.stairs && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">External Stairs</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">Galvanized steel</td>
                  <td className="px-3 py-1.5 text-right font-medium">$5,000</td>
                </tr>
              )}
              {state.balcony && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Balcony</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">Steel with railing</td>
                  <td className="px-3 py-1.5 text-right font-medium">$6,000</td>
                </tr>
              )}
              {state.roofTerrace && (
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-1.5"></td>
                  <td className="px-3 py-1.5 text-gray-700">Roof Terrace</td>
                  <td className="px-3 py-1.5 text-right font-medium">1</td>
                  <td className="px-3 py-1.5 text-gray-500">With railing + access</td>
                  <td className="px-3 py-1.5 text-right font-medium">$7,500</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           DOOR & WINDOW SCHEDULE
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span></span> Door &amp; Window Schedule
        </h2>
        {state.windows.length === 0 && state.doors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No windows or doors configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">ID</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Type</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Width</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Height</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Qty</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">Location</th>
                </tr>
              </thead>
              <tbody>
                {/* Windows grouped by wall */}
                {(["top", "bottom", "left", "right"] as Wall[]).map((wall) => {
                  const wallWindows = state.windows.filter(w => w.wall === wall);
                  if (wallWindows.length === 0) return null;
                  return (
                    <tr key={`win-${wall}`} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">W-{wall.substring(0, 1).toUpperCase()}</td>
                      <td className="px-3 py-1.5 text-gray-700">Window</td>
                      <td className="px-3 py-1.5 text-right">900mm</td>
                      <td className="px-3 py-1.5 text-right">1200mm</td>
                      <td className="px-3 py-1.5 text-right font-medium">{wallWindows.length}</td>
                      <td className="px-3 py-1.5 text-gray-500">{WALL_LABEL[wall]} wall</td>
                    </tr>
                  );
                })}
                {/* Doors grouped by wall */}
                {(["top", "bottom", "left", "right"] as Wall[]).map((wall) => {
                  const wallDoors = state.doors.filter(d => d.wall === wall);
                  if (wallDoors.length === 0) return null;
                  return (
                    <tr key={`door-${wall}`} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">D-{wall.substring(0, 1).toUpperCase()}</td>
                      <td className="px-3 py-1.5 text-gray-700">Door</td>
                      <td className="px-3 py-1.5 text-right">900mm</td>
                      <td className="px-3 py-1.5 text-right">2100mm</td>
                      <td className="px-3 py-1.5 text-right font-medium">{wallDoors.length}</td>
                      <td className="px-3 py-1.5 text-gray-500">{WALL_LABEL[wall]} wall</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════
           SOLAR PANEL LAYOUT
           ═══════════════════════════════════════════════ */}
      {state.solarPanels && (
        <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span></span> Solar Panel Layout — Roof Plan
          </h2>
          <div className="flex justify-center bg-[#f8fafc] rounded-lg p-4">
            <svg viewBox="0 0 400 200" className="w-full max-w-2xl" style={{ maxHeight: "300px" }}>
              {/* Roof outline */}
              <rect x="20" y="10" width="360" height="180" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" rx="2" />
              {/* Label */}
              <text x="200" y="30" textAnchor="middle" fontSize="8" fontWeight="700" fill="#334155" fontFamily="system-ui, sans-serif">
                Roof Area: {Math.round(dims.lengthFt * dims.widthFt * 0.0929)} m²
              </text>
              {/* Solar panels grid */}
              {Array.from({ length: Math.min(solar.panels, 24) }).map((_, i) => {
                const cols = Math.min(6, Math.ceil(Math.sqrt(solar.panels)));
                const rows = Math.ceil(Math.min(solar.panels, 24) / cols);
                const panelW = 320 / cols - 8;
                const panelH = 120 / rows - 8;
                const col = i % cols;
                const row = Math.floor(i / cols);
                const px = 40 + col * (panelW + 8) + 4;
                const py = 50 + row * (panelH + 8) + 4;
                return (
                  <g key={i}>
                    <rect x={px} y={py} width={panelW} height={panelH} fill="#1a237e" stroke="#0d47a1" strokeWidth="1" rx="2" />
                    <line x1={px + panelW / 2} y1={py} x2={px + panelW / 2} y2={py + panelH} stroke="#0d47a1" strokeWidth="0.5" />
                    <line x1={px} y1={py + panelH / 2} x2={px + panelW} y2={py + panelH / 2} stroke="#0d47a1" strokeWidth="0.5" />
                  </g>
                );
              })}
              {/* Legend */}
              <text x="200" y="185" textAnchor="middle" fontSize="6" fill="#64748b" fontFamily="system-ui, sans-serif">
                {solar.panels} panels · Orientation: South-facing · Spacing: 20mm · {solar.kwp} kWp total
              </text>
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-700">Panel Count:</span> {solar.panels}
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-700">Total Power:</span> {solar.kwp} kWp
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-700">Panel Type:</span> {state.panelType || "Standard"} (400W)
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="font-semibold text-gray-700">Annual Est.:</span> ~{Math.round(solar.kwp * 900)} kWh
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
           IFC EXPORT PLACEHOLDER
           ═══════════════════════════════════════════════ */}
      <section className="print-section mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm no-print">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span></span> BIM / IFC Export
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-800 font-semibold mb-1">Coming in Phase 6.1</p>
          <p className="text-amber-700 text-sm">IFC/BIM export will be available soon. The PDF + material list + SVG drawings already provide everything needed for quoting and production.</p>
          <button disabled className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-amber-200 text-amber-600 cursor-not-allowed">
            Export IFC — Coming Soon
          </button>
        </div>
      </section>

      {/* Footer for print */}
      <div className="print-only text-center text-xs text-gray-400 py-4 border-t border-gray-200 mt-8">
        Generated by Kitozon Smart Container Designer — {today} — Page <span className="page-number"></span>
      </div>
    </div>
  );
}
