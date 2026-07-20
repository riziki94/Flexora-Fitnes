import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Container3DHandle } from "../../components/Container3D";
const Container3D = lazy(() => import("../../components/Container3D"));
import RoomFullscreen from "../../components/RoomFullscreen";
import EnergyPanel, { type EnergyState, type PanelType, type BatterySize, type InverterType, type WindSize, type HeatPumpType, type EVChargerPower, DEFAULT_ENERGY_STATE } from "../../components/EnergyPanel";
import DocumentationPanel from "../../components/DocumentationPanel";
import { formatPrice, formatPriceExMva } from "../../lib/currency";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export const Route = createFileRoute("/zongosol/")({
  component: ZongosolPage,
});

// ── Types ──────────────────────────────────────────────

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

interface Window_ {
  id: string;
  wall: Wall;
  position: number;
}

interface Door_ {
  id: string;
  wall: Wall;
  position: number;
}

interface RoomDef {
  id: string;
  type: RoomType;
  label: string;
}

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
  // Energy Phase 5
  panelType: PanelType;
  batterySize: BatterySize;
  inverterType: InverterType;
  windTurbine: boolean;
  windTurbineSize: WindSize;
  heatPumpType: HeatPumpType;
  evChargerPower: EVChargerPower;
}

type Action =
  | { type: "SELECT_MODEL"; model: string }
  | { type: "SET_SIZE"; size: ContainerSize }
  | { type: "SET_CUSTOM_LENGTH"; length: number }
  | { type: "SET_CUSTOM_WIDTH"; width: number }
  | { type: "ADD_WINDOW"; wall: Wall }
  | { type: "REMOVE_WINDOW"; id: string }
  | { type: "ADD_DOOR"; wall: Wall }
  | { type: "REMOVE_DOOR"; id: string }
  | { type: "SET_EXTERIOR_COLOR"; color: ExteriorColor }
  | { type: "TOGGLE_SOLAR" }
  | { type: "TOGGLE_DECK" }
  | { type: "SET_KITCHEN_LAYOUT"; layout: KitchenLayout }
  | { type: "SET_KITCHEN_BRAND"; brand: KitchenBrand }
  | { type: "SET_KITCHEN_COUNTERTOP"; material: CountertopMaterial }
  | { type: "TOGGLE_KITCHEN_APPLIANCE"; appliance: KitchenAppliance }
  | { type: "TOGGLE_BATH_FIXTURE"; fixture: BathFixture }
  | { type: "TOGGLE_LIVING_ITEM"; item: LivingItem }
  | { type: "TOGGLE_BEDROOM_ITEM"; item: BedroomItem }
  | { type: "CLEAR_LIVING" }
  | { type: "CLEAR_BEDROOM" }
  | { type: "SET_ELECTRICAL_OUTLETS"; count: number }
  | { type: "SET_ELECTRICAL_LIGHTS"; count: number }
  | { type: "SET_SMART_HOME"; system: SmartHomeType }
  | { type: "TOGGLE_EV_CHARGER" }
  | { type: "LOAD_STATE"; state: DesignState }
  | { type: "RESET" }
  | { type: "SET_LAYOUT_TYPE"; layoutType: LayoutType }
  | { type: "TOGGLE_STAIRS" }
  | { type: "TOGGLE_BALCONY" }
  | { type: "TOGGLE_ROOF_TERRACE" }
  // Energy Phase 5
  | { type: "SET_PANEL_TYPE"; panelType: PanelType }
  | { type: "SET_BATTERY_SIZE"; batterySize: BatterySize }
  | { type: "SET_INVERTER_TYPE"; inverterType: InverterType }
  | { type: "TOGGLE_WIND_TURBINE" }
  | { type: "SET_WIND_TURBINE_SIZE"; windTurbineSize: WindSize }
  | { type: "SET_HEAT_PUMP_TYPE"; heatPumpType: HeatPumpType }
  | { type: "SET_EV_CHARGER_POWER"; evChargerPower: EVChargerPower };

// ── Model definitions ──────────────────────────────────

interface ModelDef {
  id: string;
  name: string;
  subtitle: string;
  size: ContainerSize;
  rooms: RoomDef[];
  basePrice: number;
  description: string;
  defaultWindows: Window_[];
  defaultDoors: Door_[];
}

const MODELS: ModelDef[] = [
  {
    id: "studio", name: "Studio", subtitle: "Compact & Cozy",
    size: "20ft",
    rooms: [
      { id: "bath-studio", type: "bathroom", label: "Bath" },
      { id: "kit-studio", type: "kitchen", label: "Kitchenette" },
      { id: "liv-studio", type: "living", label: "Living / Bed" },
    ],
    basePrice: 150000,
    description: "Perfekt lite hjem. En åpen stue/soverom med kompakt kjøkken og bad.",
    defaultWindows: [{ id: "ws1", wall: "bottom", position: 30 }, { id: "ws2", wall: "bottom", position: 70 }],
    defaultDoors: [{ id: "ds1", wall: "left", position: 50 }],
  },
  {
    id: "family", name: "Family", subtitle: "2-Bedroom Home",
    size: "40ft",
    rooms: [
      { id: "bath-family", type: "bathroom", label: "Bathroom" },
      { id: "kit-family", type: "kitchen", label: "Kitchen" },
      { id: "liv-family", type: "living", label: "Living Room" },
      { id: "bed1-family", type: "bedroom", label: "Bedroom 1" },
      { id: "bed2-family", type: "bedroom", label: "Bedroom 2" },
    ],
    basePrice: 280000,
    description: "Fullverdig familiehjem med to soverom, separat stue, komplett kjøkken og bad.",
    defaultWindows: [{ id: "wf1", wall: "bottom", position: 20 }, { id: "wf2", wall: "bottom", position: 50 }, { id: "wf3", wall: "bottom", position: 80 }],
    defaultDoors: [{ id: "df1", wall: "left", position: 50 }, { id: "df2", wall: "right", position: 60 }],
  },
  {
    id: "premium", name: "Premium", subtitle: "Double-Wide Luxury",
    size: "double",
    rooms: [
      { id: "bath1-prem", type: "bathroom", label: "Bath 1" },
      { id: "bath2-prem", type: "bathroom", label: "Bath 2" },
      { id: "kit-prem", type: "kitchen", label: "Kitchen" },
      { id: "liv-prem", type: "living", label: "Living Room" },
      { id: "bed1-prem", type: "bedroom", label: "Master Bed" },
      { id: "bed2-prem", type: "bedroom", label: "Bedroom 2" },
      { id: "bed3-prem", type: "bedroom", label: "Bedroom 3" },
    ],
    basePrice: 480000,
    description: "Romslig dobbel-containerbolig. Tre soverom, to bad, komplett kjøkken og stor stue.",
    defaultWindows: [{ id: "wp1", wall: "top", position: 25 }, { id: "wp2", wall: "top", position: 75 }, { id: "wp3", wall: "bottom", position: 30 }, { id: "wp4", wall: "bottom", position: 70 }],
    defaultDoors: [{ id: "dp1", wall: "left", position: 40 }, { id: "dp2", wall: "left", position: 75 }],
  },
  {
    id: "custom", name: "Custom", subtitle: "Build Your Own",
    size: "custom",
    rooms: [
      { id: "bath-cust", type: "bathroom", label: "Bathroom" },
      { id: "kit-cust", type: "kitchen", label: "Kitchen" },
      { id: "liv-cust", type: "living", label: "Living Room" },
      { id: "bed1-cust", type: "bedroom", label: "Bedroom" },
    ],
    basePrice: 200000,
    description: "Design fra bunnen av. Velg containerstørrelse, romløsning og alle detaljer selv.",
    defaultWindows: [{ id: "wc1", wall: "bottom", position: 50 }],
    defaultDoors: [{ id: "dc1", wall: "left", position: 50 }],
  },
];

// ── Price constants ────────────────────────────────────

const COLOR_PRICE: Record<ExteriorColor, number> = { wood: 5000, metal: 3000, white: 0, green: 2000, charcoal: 3500 };
const KITCHEN_LAYOUT_PRICE: Record<KitchenLayout, number> = { "L-shape": 8000, galley: 6000, island: 12000 };
const KITCHEN_BRAND_PRICE: Record<KitchenBrand, number> = { ikea: 15000, hth: 25000, epoq: 20000, custom: 35000 };
const KITCHEN_COUNTERTOP_PRICE: Record<CountertopMaterial, number> = { wood: 2000, granite: 5000, marble: 7000, laminate: 500, steel: 3000 };
const KITCHEN_APPLIANCE_PRICE: Record<KitchenAppliance, number> = { refrigerator: 4000, oven: 3000, dishwasher: 2500, microwave: 1000, cooktop: 2500 };
const BATH_FIXTURE_PRICE: Record<BathFixture, number> = { shower: 5000, tub: 8000, "double-sink": 3000, toilet: 2000, bidet: 1500 };
const LIVING_ITEM_PRICE: Record<LivingItem, number> = { "sofa-3": 8000, "sofa-2": 5000, sectional: 12000, "coffee-table": 1500, "tv-unit": 3000, "dining-4": 4000, "dining-6": 6000, bookshelf: 2000 };
const BEDROOM_ITEM_PRICE: Record<BedroomItem, number> = { "bed-double": 6000, "bed-queen": 5000, "bed-single": 3000, wardrobe: 4000, nightstand: 1000, desk: 2500 };

const LIVING_LABELS: Record<LivingItem, string> = { "sofa-3": "3-Seat Sofa", "sofa-2": "2-Seat Sofa", sectional: "Sectional", "coffee-table": "Coffee Table", "tv-unit": "TV Unit", "dining-4": "Dining (4-seat)", "dining-6": "Dining (6-seat)", bookshelf: "Bookshelf" };
const BEDROOM_LABELS: Record<BedroomItem, string> = { "bed-double": "Double Bed", "bed-queen": "Queen Bed", "bed-single": "Single Bed", wardrobe: "Wardrobe", nightstand: "Nightstand", desk: "Desk" };
const LIVING_ICONS: Record<LivingItem, string> = { "sofa-3": "", "sofa-2": "", sectional: "", "coffee-table": "", "tv-unit": "", "dining-4": "", "dining-6": "", bookshelf: "" };
const BEDROOM_ICONS: Record<BedroomItem, string> = { "bed-double": "", "bed-queen": "", "bed-single": "", wardrobe: "", nightstand: "", desk: "" };

function calcTotal(state: DesignState): number {
  const model = MODELS.find((m) => m.id === state.selectedModel);
  let total = model?.basePrice ?? 0;
  total += COLOR_PRICE[state.exteriorColor];
  total += KITCHEN_LAYOUT_PRICE[state.kitchenLayout];
  total += KITCHEN_BRAND_PRICE[state.kitchenBrand];
  total += KITCHEN_COUNTERTOP_PRICE[state.kitchenCountertop];
  total += state.kitchenAppliances.reduce((s, a) => s + KITCHEN_APPLIANCE_PRICE[a], 0);
  total += state.bathFixtures.reduce((s, f) => s + BATH_FIXTURE_PRICE[f], 0);
  total += state.livingItems.reduce((s, i) => s + LIVING_ITEM_PRICE[i], 0);
  total += state.bedroomItems.reduce((s, i) => s + BEDROOM_ITEM_PRICE[i], 0);
  total += state.electricalOutlets * 200;
  total += state.electricalLights * 500;
  if (state.smartHome === "knx") total += 15000;
  else if (state.smartHome === "zigbee") total += 5000;
  if (state.evCharger) total += 5000;
  total += state.windows.length * 500;
  total += state.doors.length * 400;
  if (state.solarPanels) total += 8000;
  if (state.deck) total += 5000;
  if (state.stairs) total += 3000;
  if (state.balcony) total += 6000;
  if (state.roofTerrace) total += 7500;
  // Energy Phase 5 pricing
  if (state.solarPanels) {
    // Roof area calc
    let roofM2 = 6.058 * 2.438;
    if (state.containerSize === "40ft") roofM2 = 12.192 * 2.438;
    else if (state.containerSize === "double") roofM2 = 12.192 * 4.876;
    else if (state.containerSize === "custom") roofM2 = (state.customLength * 0.3048) * (state.customWidth * 0.3048);
    const panelCount = Math.max(1, Math.floor((roofM2 * 0.85) / 1.7));
    total += panelCount * 3500; // NOK per panel installed
    // Subtract the old flat-rate solar price since we now calculate per-panel
    total -= 15000;
  }
  if (state.batterySize !== "none") total += parseInt(state.batterySize) * 5000;
  if (state.windTurbine) total += state.windTurbineSize === "1" ? 30000 : state.windTurbineSize === "3" ? 50000 : 80000;
  if (state.heatPumpType === "air-air") total += 50000;
  else if (state.heatPumpType === "air-water") total += 80000;
  else if (state.heatPumpType === "ground") total += 150000;
  return total;
}

// ── Reducer ────────────────────────────────────────────

const STORAGE_KEY = "kitozon-zongosol-design";

const DEFAULT_DESIGN_STATE: DesignState = {
  selectedModel: null, containerSize: "20ft", customLength: 20, customWidth: 8,
  rooms: [], windows: [], doors: [],
  exteriorColor: "white", solarPanels: false, deck: false,
  kitchenLayout: "galley", kitchenBrand: "ikea", kitchenCountertop: "laminate",
  kitchenAppliances: ["refrigerator", "cooktop"],
  bathFixtures: ["shower", "toilet"],
  livingItems: [], bedroomItems: [],
  electricalOutlets: 8, electricalLights: 4,
  smartHome: "none", evCharger: false,
  layoutType: "single", stairs: false, balcony: false, roofTerrace: false,
  panelType: "standard", batterySize: "none", inverterType: "string",
  windTurbine: false, windTurbineSize: "1", heatPumpType: "none", evChargerPower: "7.4",
};

function initialDesignState(): DesignState {
  // SSR safety: localStorage is not available on the server
  if (typeof window === "undefined") return { ...DEFAULT_DESIGN_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DesignState>;
      // Merge with defaults, skipping null/undefined to prevent ".label of undefined" errors
      const result = { ...DEFAULT_DESIGN_STATE };
      for (const key of Object.keys(parsed) as (keyof DesignState)[]) {
        if (parsed[key] != null) {
          (result as any)[key] = parsed[key];
        }
      }
      return result;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_DESIGN_STATE };
}

function designReducer(state: DesignState, action: Action): DesignState {
  switch (action.type) {
    case "SELECT_MODEL": {
      const model = MODELS.find((m) => m.id === action.model);
      if (!model) return state;
      return { ...state, selectedModel: model.id, containerSize: model.size, rooms: [...model.rooms], windows: [...model.defaultWindows], doors: [...model.defaultDoors] };
    }
    case "SET_SIZE": return { ...state, containerSize: action.size };
    case "SET_CUSTOM_LENGTH": return { ...state, customLength: action.length };
    case "SET_CUSTOM_WIDTH": return { ...state, customWidth: action.width };
    case "ADD_WINDOW": {
      const existing = state.windows.filter((w) => w.wall === action.wall);
      const pos = existing.length > 0 ? Math.min(90, Math.max(10, existing[existing.length - 1].position + 15)) : 50;
      return { ...state, windows: [...state.windows, { id: `w${Date.now()}`, wall: action.wall, position: pos }] };
    }
    case "REMOVE_WINDOW": return { ...state, windows: state.windows.filter((w) => w.id !== action.id) };
    case "ADD_DOOR": {
      const existing = state.doors.filter((d) => d.wall === action.wall);
      const pos = existing.length > 0 ? Math.min(90, Math.max(10, existing[existing.length - 1].position + 15)) : 50;
      return { ...state, doors: [...state.doors, { id: `d${Date.now()}`, wall: action.wall, position: pos }] };
    }
    case "REMOVE_DOOR": return { ...state, doors: state.doors.filter((d) => d.id !== action.id) };
    case "SET_EXTERIOR_COLOR": return { ...state, exteriorColor: action.color };
    case "TOGGLE_SOLAR": return { ...state, solarPanels: !state.solarPanels };
    case "TOGGLE_DECK": return { ...state, deck: !state.deck };
    case "SET_KITCHEN_LAYOUT": return { ...state, kitchenLayout: action.layout };
    case "SET_KITCHEN_BRAND": return { ...state, kitchenBrand: action.brand };
    case "SET_KITCHEN_COUNTERTOP": return { ...state, kitchenCountertop: action.material };
    case "TOGGLE_KITCHEN_APPLIANCE": {
      const has = state.kitchenAppliances.includes(action.appliance);
      return { ...state, kitchenAppliances: has ? state.kitchenAppliances.filter(a => a !== action.appliance) : [...state.kitchenAppliances, action.appliance] };
    }
    case "TOGGLE_BATH_FIXTURE": {
      const has = state.bathFixtures.includes(action.fixture);
      return { ...state, bathFixtures: has ? state.bathFixtures.filter((f) => f !== action.fixture) : [...state.bathFixtures, action.fixture] };
    }
    case "TOGGLE_LIVING_ITEM": {
      const has = state.livingItems.includes(action.item);
      return { ...state, livingItems: has ? state.livingItems.filter(i => i !== action.item) : [...state.livingItems, action.item] };
    }
    case "TOGGLE_BEDROOM_ITEM": {
      const has = state.bedroomItems.includes(action.item);
      return { ...state, bedroomItems: has ? state.bedroomItems.filter(i => i !== action.item) : [...state.bedroomItems, action.item] };
    }
    case "CLEAR_LIVING": return { ...state, livingItems: [] };
    case "CLEAR_BEDROOM": return { ...state, bedroomItems: [] };
    case "SET_ELECTRICAL_OUTLETS": return { ...state, electricalOutlets: Math.max(0, action.count) };
    case "SET_ELECTRICAL_LIGHTS": return { ...state, electricalLights: Math.max(0, action.count) };
    case "SET_SMART_HOME": return { ...state, smartHome: action.system };
    case "TOGGLE_EV_CHARGER": return { ...state, evCharger: !state.evCharger };
    case "LOAD_STATE": return action.state;
    case "RESET": return initialDesignState();
    case "SET_LAYOUT_TYPE": return { ...state, layoutType: action.layoutType };
    case "TOGGLE_STAIRS": return { ...state, stairs: !state.stairs };
    case "TOGGLE_BALCONY": return { ...state, balcony: !state.balcony };
    case "TOGGLE_ROOF_TERRACE": return { ...state, roofTerrace: !state.roofTerrace };
    // Energy Phase 5
    case "SET_PANEL_TYPE": return { ...state, panelType: action.panelType };
    case "SET_BATTERY_SIZE": return { ...state, batterySize: action.batterySize };
    case "SET_INVERTER_TYPE": return { ...state, inverterType: action.inverterType };
    case "TOGGLE_WIND_TURBINE": return { ...state, windTurbine: !state.windTurbine };
    case "SET_WIND_TURBINE_SIZE": return { ...state, windTurbineSize: action.windTurbineSize };
    case "SET_HEAT_PUMP_TYPE": return { ...state, heatPumpType: action.heatPumpType };
    case "SET_EV_CHARGER_POWER": return { ...state, evChargerPower: action.evChargerPower };
    default: return state;
  }
}

// ── SVG color maps ─────────────────────────────────────

const ROOM_SVG: Record<RoomType, { fill: string; stroke: string }> = {
  kitchen: { fill: "#fff7ed", stroke: "#f97316" },
  bathroom: { fill: "#eff6ff", stroke: "#3b82f6" },
  living: { fill: "#f0fdf4", stroke: "#22c55e" },
  bedroom: { fill: "#faf5ff", stroke: "#a855f7" },
};

const EXTERIOR_CSS: Record<ExteriorColor, string> = {
  wood: "bg-amber-700", metal: "bg-gray-400", white: "bg-white border border-gray-300", green: "bg-green-800", charcoal: "bg-gray-700",
};

const EXTERIOR_BORDER: Record<ExteriorColor, string> = {
  wood: "border-amber-700", metal: "border-gray-400", white: "border-gray-300", green: "border-green-800", charcoal: "border-gray-700",
};

const EXTERIOR_TEXT: Record<ExteriorColor, string> = {
  wood: "text-white", metal: "text-gray-900", white: "text-gray-900", green: "text-white", charcoal: "text-white",
};

const EXTERIOR_LABELS: Record<ExteriorColor, string> = {
  wood: "Natural Wood", metal: "Brushed Metal", white: "Classic White", green: "Forest Green", charcoal: "Charcoal",
};

// ── Solar calculation helper ───────────────────────────

function estimateSolar(state: DesignState): { annualKwh: number; co2Saved: number; panels: number } {
  let sqft = 160;
  if (state.containerSize === "40ft") sqft = 320;
  else if (state.containerSize === "double") sqft = 640;
  else if (state.containerSize === "custom") sqft = state.customLength * state.customWidth;
  if (!state.solarPanels) return { annualKwh: 0, co2Saved: 0, panels: 0 };
  const panels = Math.floor(sqft / 18);
  const annualKwh = Math.round(panels * 350 * 0.75);
  const co2Saved = Math.round(annualKwh * 0.4);
  return { annualKwh, co2Saved, panels };
}

// ── Floor Plan SVG ─────────────────────────────────────

function getRoomLayout(
  rooms: RoomDef[],
  containerSize: ContainerSize,
): { x: number; y: number; w: number; h: number; room: RoomDef }[] {
  const H = containerSize === "40ft" ? 400 : containerSize === "double" ? 260 : containerSize === "custom" ? 350 : 240;
  const W = containerSize === "double" ? 200 : 120;
  const pad = 10;

  if (rooms.length <= 3) {
    const usableH = H - pad * 2;
    const usableW = W - pad * 2;
    return rooms.map((room, i) => {
      const segH = usableH / rooms.length;
      return { x: pad, y: pad + i * segH, w: usableW, h: segH, room };
    });
  }
  if (rooms.length === 5) {
    const usableH = H - pad * 2;
    const usableW = W - pad * 2;
    const halfW = usableW / 2;
    return rooms.map((room, i) => {
      if (i < 2) {
        const segH = usableH * 0.22;
        return { x: pad + (i % 2) * halfW, y: pad, w: halfW, h: segH, room };
      }
      if (i === 2) {
        return { x: pad, y: pad + usableH * 0.22, w: usableW, h: usableH * 0.28, room };
      }
      const idx = i - 3;
      const segH = usableH * 0.50;
      return { x: pad + idx * halfW, y: pad + usableH * 0.50, w: halfW, h: segH, room };
    });
  }
  if (rooms.length >= 7) {
    const usableH = H - pad * 2;
    const usableW = W - pad * 2;
    const thirdW = usableW / 3;
    const thirdH = usableH / 3;
    return rooms.map((room, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return { x: pad + col * thirdW, y: pad + row * thirdH, w: thirdW, h: thirdH, room };
    });
  }
  const usableH = H - pad * 2;
  const usableW = W - pad * 2;
  const segH = usableH / rooms.length;
  return rooms.map((room, i) => ({
    x: pad, y: pad + i * segH, w: usableW, h: segH, room,
  }));
}

function FloorPlan({ state }: { state: DesignState }) {
  if (!state.selectedModel) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center px-6">
          <svg className="mx-auto h-14 w-14 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-sm font-medium">Select a container model above</p>
          <p className="text-xs mt-1 text-gray-400">The floor plan will appear here</p>
        </div>
      </div>
    );
  }

  const containerH = state.containerSize === "40ft" ? 400 : state.containerSize === "double" ? 260 : state.containerSize === "custom" ? 350 : 240;
  const containerW = state.containerSize === "double" ? 200 : 120;
  const layout = getRoomLayout(state.rooms, state.containerSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Floor Plan — {MODELS.find((m) => m.id === state.selectedModel)?.name}
        </span>
      </div>
      <div className="p-4 flex justify-center bg-[#f8fafc]">
        <svg viewBox={`0 0 ${containerW} ${containerH}`} className="w-full max-w-lg" style={{ maxHeight: "500px" }}>
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={containerW} height={containerH} fill="url(#grid)" rx="2" />
          <rect x="4" y="4" width={containerW - 8} height={containerH - 8} fill="none" stroke="#94a3b8" strokeWidth="3" rx="4" strokeDasharray="8 3" />
          {layout.map(({ x, y, w, h, room }) => (
            <g key={room.id}>
              <rect x={x} y={y} width={w} height={h} fill={ROOM_SVG[room.type].fill} stroke={ROOM_SVG[room.type].stroke} strokeWidth="2" rx="3" />
              <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={room.type === "bathroom" ? "6" : "7"} fontWeight="600" fill={ROOM_SVG[room.type].stroke} fontFamily="system-ui">{room.label}</text>
            </g>
          ))}
          {state.windows.map((win) => {
            let wx: number, wy: number, ww: number, wh: number;
            const winSize = 8;
            if (win.wall === "top") { wx = 4 + (containerW - 8) * (win.position / 100) - winSize / 2; wy = 4 - 2; ww = winSize; wh = 4; }
            else if (win.wall === "bottom") { wx = 4 + (containerW - 8) * (win.position / 100) - winSize / 2; wy = containerH - 4 - 2; ww = winSize; wh = 4; }
            else if (win.wall === "left") { wx = 4 - 2; wy = 4 + (containerH - 8) * (win.position / 100) - winSize / 2; ww = 4; wh = winSize; }
            else { wx = containerW - 4 - 2; wy = 4 + (containerH - 8) * (win.position / 100) - winSize / 2; ww = 4; wh = winSize; }
            return <rect key={win.id} x={wx} y={wy} width={ww} height={wh} fill="#38bdf8" stroke="#0284c7" strokeWidth="1" rx="1" />;
          })}
          {state.doors.map((door) => {
            let dx: number, dy: number, dw: number, dh: number;
            const doorSize = 6;
            if (door.wall === "top") { dx = 4 + (containerW - 8) * (door.position / 100) - doorSize / 2; dy = 4 - 2; dw = doorSize; dh = 4; }
            else if (door.wall === "bottom") { dx = 4 + (containerW - 8) * (door.position / 100) - doorSize / 2; dy = containerH - 4 - 2; dw = doorSize; dh = 4; }
            else if (door.wall === "left") { dx = 4 - 2; dy = 4 + (containerH - 8) * (door.position / 100) - doorSize / 2; dw = 4; dh = doorSize; }
            else { dx = containerW - 4 - 2; dy = 4 + (containerH - 8) * (door.position / 100) - doorSize / 2; dw = 4; dh = doorSize; }
            return <rect key={door.id} x={dx} y={dy} width={dw} height={dh} fill="#ef4444" stroke="#b91c1c" strokeWidth="1" rx="1" />;
          })}
        </svg>
      </div>
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 text-xs">
        {(["kitchen", "bathroom", "living", "bedroom"] as RoomType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ROOM_SVG[type].fill, border: `1.5px solid ${ROOM_SVG[type].stroke}` }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2"><span className="inline-block w-3 h-3 rounded-sm bg-sky-400 border border-sky-600" />Window</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500 border border-red-700" />Door</span>
      </div>
    </div>
  );
}

// ── Model Selector ────────────────────────────────────

function ModelSelector({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<Action> }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
          <svg className="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Choose Your Container Home</h2>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {MODELS.map((model) => {
          const selected = state.selectedModel === model.id;
          return (
            <button
              key={model.id}
              onClick={() => dispatch({ type: "SELECT_MODEL", model: model.id })}
              className={`text-left rounded-xl border-2 p-5 transition-all duration-200 ${
                selected ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100" : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm"
              }`}
            >
              <img src={`/images/container-${model.id}.png`} alt={model.name} className="w-full h-32 object-cover rounded-lg mb-3" />
              <div className="flex items-start justify-between mb-2">
                <span className={`text-sm font-bold ${selected ? "text-emerald-700" : "text-gray-900"}`}>{model.name}</span>
                {selected && (
                  <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{model.subtitle}</p>
              <p className="text-xs text-gray-500 mb-1">{model.size === "20ft" ? "20ft Container" : model.size === "40ft" ? "40ft Container" : model.size === "double" ? "2x 40ft Double-Wide" : "Custom Size"}{" · "}{model.rooms.length} rooms</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{model.description}</p>
              <p className="text-lg font-bold text-emerald-700">{formatPriceExMva(model.basePrice)}</p>
              <p className="text-xs text-gray-400">Starting price eks. mva</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Layout Selector ─────────────────────────────────────

const LAYOUT_OPTIONS: { value: LayoutType; label: string; icon: string; desc: string }[] = [
  { value: "single", label: "Single", icon: "", desc: "One container" },
  { value: "side-by-side", label: "Side-by-Side", icon: "", desc: "Two adjacent" },
  { value: "l-shape", label: "L-Shape", icon: "└", desc: "Two perpendicular" },
  { value: "u-shape", label: "U-Shape", icon: "⊔", desc: "Three in U" },
  { value: "stacked", label: "Stacked", icon: "⬆", desc: "Two-story" },
];

function LayoutSelector({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<Action> }) {
  if (!state.selectedModel) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
          <svg className="h-4 w-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Building Layout</h2>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {LAYOUT_OPTIONS.map((opt) => {
          const selected = state.layoutType === opt.value;
          return (
            <button key={opt.value} onClick={() => dispatch({ type: "SET_LAYOUT_TYPE", layoutType: opt.value })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                selected ? "border-blue-500 bg-blue-50 shadow-sm shadow-blue-100" : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className={`text-xs font-bold ${selected ? "text-blue-700" : "text-gray-700"}`}>{opt.label}</span>
              <span className="text-[10px] text-gray-400">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Kitchen Brand colors ─────────────────────────────────

const BRAND_COLORS: Record<KitchenBrand, { primary: string; secondary: string; label: string }> = {
  ikea: { primary: "#f5f0e8", secondary: "#d4c5a9", label: "IKEA — White/Light Wood" },
  hth: { primary: "#5C3A1E", secondary: "#3E2710", label: "HTH — Dark Wood" },
  epoq: { primary: "#9CA3AF", secondary: "#6B7280", label: "Epoq — Modern Grey" },
  custom: { primary: "#E5E7EB", secondary: "#D1D5DB", label: "Custom — Bespoke" },
};

const COUNTERTOP_SWATCHES: { value: CountertopMaterial; label: string; color: string; price: number }[] = [
  { value: "wood", label: "Wood", color: "#8B5E3C", price: 5000 },
  { value: "granite", label: "Granite", color: "#4A4A4A", price: 15000 },
  { value: "marble", label: "Marble", color: "#F5F5F0", price: 20000 },
  { value: "laminate", label: "Laminate", color: "#E5E7EB", price: 2000 },
  { value: "steel", label: "Steel", color: "#9CA3AF", price: 8000 },
];

const APPLIANCE_LIST: { value: KitchenAppliance; label: string; icon: string }[] = [
  { value: "refrigerator", label: "Refrigerator", icon: "" },
  { value: "oven", label: "Oven", icon: "" },
  { value: "dishwasher", label: "Dishwasher", icon: "" },
  { value: "microwave", label: "Microwave", icon: "" },
  { value: "cooktop", label: "Cooktop", icon: "" },
];

// ── Interior Designer Panel ────────────────────────────

function InteriorPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<Action> }) {
  const [tab, setTab] = useState<"kitchen" | "bathroom" | "furniture" | "electrical" | "windows" | "doors" | "size">("kitchen");
  const wallOptions: { value: Wall; label: string }[] = [
    { value: "top", label: "Top Wall" }, { value: "bottom", label: "Bottom Wall" },
    { value: "left", label: "Left Wall" }, { value: "right", label: "Right Wall" },
  ];

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: "kitchen", label: "Kitchen", icon: "" },
    { key: "bathroom", label: "Bathroom", icon: "" },
    { key: "furniture", label: "Furniture", icon: "" },
    { key: "electrical", label: "Electrical", icon: "" },
    { key: "windows", label: "Windows", icon: "" },
    { key: "doors", label: "Doors", icon: "" },
    { key: "size", label: "Size", icon: "" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Interior Designer
        </span>
      </div>
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          ><span>{t.icon}</span> {t.label}</button>
        ))}
      </div>
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Kitchen Tab */}
        {tab === "kitchen" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Kitchen Layout</label>
              <div className="grid grid-cols-3 gap-2">
                {(["L-shape", "galley", "island"] as KitchenLayout[]).map((layout) => (
                  <button key={layout} onClick={() => dispatch({ type: "SET_KITCHEN_LAYOUT", layout })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.kitchenLayout === layout ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{layout === "L-shape" ? " L-Shape" : layout === "galley" ? "⬛ Galley" : "▣ Island"}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Kitchen Brand</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(BRAND_COLORS) as KitchenBrand[]).map((brand) => (
                  <button key={brand} onClick={() => dispatch({ type: "SET_KITCHEN_BRAND", brand })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      state.kitchenBrand === brand ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="w-8 h-6 rounded" style={{ backgroundColor: BRAND_COLORS[brand].primary, border: `2px solid ${BRAND_COLORS[brand].secondary}` }} />
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">{brand}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{BRAND_COLORS[state.kitchenBrand]?.label ?? ""} · {formatPrice(KITCHEN_BRAND_PRICE[state.kitchenBrand] ?? 0)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Countertop Material</label>
              <div className="flex gap-2 flex-wrap">
                {COUNTERTOP_SWATCHES.map((sw) => (
                  <button key={sw.value} onClick={() => dispatch({ type: "SET_KITCHEN_COUNTERTOP", material: sw.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      state.kitchenCountertop === sw.value ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: sw.color }} />
                    {sw.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Appliances</label>
              <div className="flex flex-wrap gap-2">
                {APPLIANCE_LIST.map((app) => {
                  const active = state.kitchenAppliances.includes(app.value);
                  return (
                    <button key={app.value} onClick={() => dispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: app.value })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    ><span>{app.icon}</span> {app.label} {active && ""}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bathroom Tab */}
        {tab === "bathroom" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Toggle bathroom fixtures — they appear as 3D objects in the bathroom.</p>
            <div className="space-y-2">
              {([
                { value: "shower" as BathFixture, label: "Shower", icon: "", desc: "Glass-walled with showerhead", price: 8000 },
                { value: "tub" as BathFixture, label: "Bathtub", icon: "", desc: "White oval bathtub", price: 15000 },
                { value: "double-sink" as BathFixture, label: "Double Sink / Vanity", icon: "", desc: "Vanity with basin", price: 5000 },
                { value: "toilet" as BathFixture, label: "Toilet", icon: "", desc: "Compact white toilet", price: 3000 },
                { value: "bidet" as BathFixture, label: "Bidet", icon: "", desc: "Compact bidet", price: 2500 },
              ]).map((fixture) => {
                const active = state.bathFixtures.includes(fixture.value);
                return (
                  <button key={fixture.value} onClick={() => dispatch({ type: "TOGGLE_BATH_FIXTURE", fixture: fixture.value })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                      active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{fixture.icon}</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{fixture.label}</p>
                        <p className="text-xs text-gray-500">{fixture.desc} · {formatPrice(fixture.price)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${active ? "bg-blue-500" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Furniture Tab */}
        {tab === "furniture" && (
          <div className="space-y-5">
            {/* Living Room */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Living Room <span className="text-gray-400 font-normal">({state.livingItems.length} items)</span></label>
                {state.livingItems.length > 0 && (
                  <button onClick={() => dispatch({ type: "CLEAR_LIVING" })} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear room</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(LIVING_LABELS) as LivingItem[]).map((item) => {
                  const active = state.livingItems.includes(item);
                  return (
                    <button key={item} onClick={() => dispatch({ type: "TOGGLE_LIVING_ITEM", item })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                        active ? "border-green-500 bg-green-50 ring-1 ring-green-300" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-lg">{LIVING_ICONS[item]}</span>
                      <span className="text-[10px] font-medium text-gray-700 leading-tight">{LIVING_LABELS[item]}</span>
                      <span className="text-[10px] text-gray-400">{formatPrice(LIVING_ITEM_PRICE[item])}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Bedroom */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Bedroom <span className="text-gray-400 font-normal">({state.bedroomItems.length} items)</span></label>
                {state.bedroomItems.length > 0 && (
                  <button onClick={() => dispatch({ type: "CLEAR_BEDROOM" })} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear room</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(BEDROOM_LABELS) as BedroomItem[]).map((item) => {
                  const active = state.bedroomItems.includes(item);
                  return (
                    <button key={item} onClick={() => dispatch({ type: "TOGGLE_BEDROOM_ITEM", item })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                        active ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-lg">{BEDROOM_ICONS[item]}</span>
                      <span className="text-[10px] font-medium text-gray-700 leading-tight">{BEDROOM_LABELS[item]}</span>
                      <span className="text-[10px] text-gray-400">{formatPrice(BEDROOM_ITEM_PRICE[item])}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Electrical Tab */}
        {tab === "electrical" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Power Outlets</label>
              <div className="flex items-center gap-3">
                <button onClick={() => dispatch({ type: "SET_ELECTRICAL_OUTLETS", count: state.electricalOutlets - 1 })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
                <span className="text-lg font-bold text-gray-900 w-8 text-center">{state.electricalOutlets}</span>
                <button onClick={() => dispatch({ type: "SET_ELECTRICAL_OUTLETS", count: state.electricalOutlets + 1 })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">+</button>
                <span className="text-xs text-gray-500">× 500 kr = {formatPrice((state.electricalOutlets * 500))}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Light Fixtures</label>
              <div className="flex items-center gap-3">
                <button onClick={() => dispatch({ type: "SET_ELECTRICAL_LIGHTS", count: state.electricalLights - 1 })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
                <span className="text-lg font-bold text-gray-900 w-8 text-center">{state.electricalLights}</span>
                <button onClick={() => dispatch({ type: "SET_ELECTRICAL_LIGHTS", count: state.electricalLights + 1 })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">+</button>
                <span className="text-xs text-gray-500">× 1 500 kr = {formatPrice((state.electricalLights * 1500))}</span>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Smart Home System</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "none" as SmartHomeType, label: "None", icon: "" },
                  { value: "knx" as SmartHomeType, label: "KNX System", icon: "", price: 15000 },
                  { value: "zigbee" as SmartHomeType, label: "Zigbee Hub", icon: "", price: 8000 },
                ]).map((opt) => (
                  <button key={opt.value} onClick={() => dispatch({ type: "SET_SMART_HOME", system: opt.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all ${
                      state.smartHome === opt.value ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{opt.label}</span>
                    {opt.value !== "none" && <span className="text-[10px] text-gray-400">+{formatPrice((opt as any).price)}</span>}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => dispatch({ type: "TOGGLE_EV_CHARGER" })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                state.evCharger ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl"></span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">EV Charger</p>
                  <p className="text-xs text-gray-500">Wall-mounted charger · +{formatPrice(8000)}</p>
                </div>
              </div>
              <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.evCharger ? "bg-emerald-500" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.evCharger ? "translate-x-5" : "translate-x-1"}`} />
              </span>
            </button>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-semibold mb-1">Electrical Summary</p>
              <div className="space-y-0.5">
                <p>Outlets: {state.electricalOutlets} · Lights: {state.electricalLights}</p>
                <p>Smart home: {state.smartHome === "none" ? "None" : state.smartHome === "knx" ? "KNX System" : "Zigbee Hub"}</p>
                <p>EV Charger: {state.evCharger ? "Yes" : "No"}</p>
                <p className="font-semibold mt-1">
                  Electrical total: {formatPrice((state.electricalOutlets * 500 + state.electricalLights * 1500 + (state.smartHome === "knx" ? 15000 : state.smartHome === "zigbee" ? 8000 : 0) + (state.evCharger ? 8000 : 0)))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Windows Tab */}
        {tab === "windows" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Click a wall to add a window (blue marks on floor plan).</p>
            <div className="grid grid-cols-2 gap-2">
              {wallOptions.map((w) => (
                <button key={w.value} onClick={() => dispatch({ type: "ADD_WINDOW", wall: w.value })}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-sky-400 hover:bg-sky-50 transition-all"
                >+ Window on {w.label}</button>
              ))}
            </div>
            {state.windows.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Current windows ({state.windows.length})</label>
                {state.windows.map((win) => (
                  <div key={win.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 capitalize">{win.wall} wall · {win.position}%</span>
                    <button onClick={() => dispatch({ type: "REMOVE_WINDOW", id: win.id })} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Doors Tab */}
        {tab === "doors" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Click a wall to add a door (red marks on floor plan).</p>
            <div className="grid grid-cols-2 gap-2">
              {wallOptions.map((w) => (
                <button key={w.value} onClick={() => dispatch({ type: "ADD_DOOR", wall: w.value })}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:border-red-400 hover:bg-red-50 transition-all"
                >+ Door on {w.label}</button>
              ))}
            </div>
            {state.doors.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Current doors ({state.doors.length})</label>
                {state.doors.map((door) => (
                  <div key={door.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 capitalize">{door.wall} wall · {door.position}%</span>
                    <button onClick={() => dispatch({ type: "REMOVE_DOOR", id: door.id })} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Size Tab */}
        {tab === "size" && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-gray-700 block">Container Size</label>
            <div className="grid grid-cols-2 gap-2">
              {(["20ft", "40ft", "double", "custom"] as ContainerSize[]).map((s) => (
                <button key={s} onClick={() => dispatch({ type: "SET_SIZE", size: s })}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                    state.containerSize === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >{s === "20ft" ? "20ft (6.1m)" : s === "40ft" ? "40ft (12.2m)" : s === "double" ? "Double-Wide" : "Custom"}</button>
              ))}
            </div>
            {state.containerSize === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Length (ft)</label>
                  <input type="number" min={10} max={53} value={state.customLength}
                    onChange={(e) => dispatch({ type: "SET_CUSTOM_LENGTH", length: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Width (ft)</label>
                  <input type="number" min={8} max={16} value={state.customWidth}
                    onChange={(e) => dispatch({ type: "SET_CUSTOM_WIDTH", width: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exterior Designer Panel ────────────────────────────

function ExteriorPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<Action> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Exterior Designer
        </span>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-3">Exterior Material &amp; Color</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(EXTERIOR_CSS) as ExteriorColor[]).map((color) => (
              <button key={color} onClick={() => dispatch({ type: "SET_EXTERIOR_COLOR", color })}
                className="flex flex-col items-center gap-1" title={EXTERIOR_LABELS[color]}
              >
                <span className={`inline-block w-10 h-10 rounded-lg border-2 transition-all ${
                    state.exteriorColor === color ? "border-emerald-500 ring-2 ring-emerald-200 scale-110" : "border-gray-300"
                  } ${EXTERIOR_CSS[color]}`}
                />
                <span className="text-[10px] text-gray-500 leading-tight text-center">{EXTERIOR_LABELS[color]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-lg p-4 ${EXTERIOR_CSS[state.exteriorColor]} ${EXTERIOR_TEXT[state.exteriorColor]} transition-colors`}>
          <div className="flex items-end justify-center gap-1 h-24 relative">
            <div className={`w-full max-w-[200px] h-16 rounded-t-lg border-2 border-b-0 ${EXTERIOR_BORDER[state.exteriorColor]} relative flex items-end justify-center`}>
              {state.solarPanels && (
                <div className="absolute -top-3 w-[90%] h-3 bg-blue-900/80 rounded-t-sm border border-blue-800 flex items-center justify-center">
                  <span className="text-[8px] text-blue-200">Solar Panels</span>
                </div>
              )}
              {state.windows.slice(0, 4).map((win, i) => (
                <span key={win.id} className="inline-block w-3 h-3 bg-sky-300/80 border border-sky-500 rounded-sm mx-0.5 mb-8" />
              ))}
              {state.deck && (
                <div className="absolute -bottom-4 w-[110%] h-2 bg-amber-600 rounded-sm border border-amber-700" />
              )}
            </div>
            <div className={`w-8 h-10 rounded-t border-2 border-b-0 ${EXTERIOR_BORDER[state.exteriorColor]}`} />
          </div>
          <p className="text-xs text-center mt-2 opacity-80">{state.solarPanels ? "Solar · " : ""}{state.deck ? "Deck · " : ""}{EXTERIOR_LABELS[state.exteriorColor]}</p>
        </div>

        <div className="space-y-3">
          <button onClick={() => dispatch({ type: "TOGGLE_SOLAR" })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              state.solarPanels ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"></span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Solar Panels</p>
                <p className="text-xs text-gray-500">+{formatPrice(15000)} · Rooftop array</p>
              </div>
            </div>
            <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.solarPanels ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.solarPanels ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>

          <button onClick={() => dispatch({ type: "TOGGLE_DECK" })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              state.deck ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"></span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Deck / Terrace</p>
                <p className="text-xs text-gray-500">+{formatPrice(8000)} · Outdoor living</p>
              </div>
            </div>
            <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.deck ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.deck ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>

          <hr className="border-gray-200" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Multi-Container Options</p>

          <button onClick={() => dispatch({ type: "TOGGLE_STAIRS" })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              state.stairs ? "border-gray-500 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"></span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">External Stairs</p>
                <p className="text-xs text-gray-500">Staircase on side</p>
              </div>
            </div>
            <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.stairs ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.stairs ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>

          <button onClick={() => dispatch({ type: "TOGGLE_BALCONY" })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              state.balcony ? "border-gray-500 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            title={state.layoutType !== "stacked" ? "Only available in Stacked layout" : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"></span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Balcony</p>
                <p className="text-xs text-gray-500">{state.layoutType === "stacked" ? "Platform on upper floor" : "Stacked layout only"}</p>
              </div>
            </div>
            <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.balcony ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.balcony ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>

          <button onClick={() => dispatch({ type: "TOGGLE_ROOF_TERRACE" })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              state.roofTerrace ? "border-gray-500 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg"></span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Roof Terrace</p>
                <p className="text-xs text-gray-500">Railing + access hatch</p>
              </div>
            </div>
            <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.roofTerrace ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.roofTerrace ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary & Order Panel ──────────────────────────────

function SummaryPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<Action> }) {
  const total = calcTotal(state);
  const [saved, setSaved] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [showLogistics, setShowLogistics] = useState(false);
  const [logisticsChoice, setLogisticsChoice] = useState<"self" | "kitozon" | null>(null);
  const model = MODELS.find((m) => m.id === state.selectedModel);
  const deposit = Math.round(total * 0.5);
  const remaining = total - deposit;

  // Stripe payment link for deposit (placeholder)
  const depositPaymentLink = "https://buy.stripe.com/deposit_50pct_placeholder";

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [state]);

  const handleOrder = useCallback(() => {
    setShowDeposit(true);
  }, []);

  const handleDepositPaid = useCallback(() => {
    setDepositPaid(true);
    setShowLogistics(true);
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm lg:sticky lg:top-20">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-green-500">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Order Summary
        </span>
      </div>
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {!state.selectedModel ? (
          <p className="text-sm text-gray-500 text-center py-4">Select a model to see pricing.</p>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{model?.name} base</span>
                <span className="font-medium text-gray-800">{formatPriceExMva(model?.basePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Layout</span>
                <span className="text-gray-700 capitalize">{state.layoutType.replace("-", " ")}</span>
              </div>
              {state.exteriorColor !== "white" && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{EXTERIOR_LABELS[state.exteriorColor]} exterior</span>
                  <span className="text-gray-700">+{formatPrice(COLOR_PRICE[state.exteriorColor])}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Kitchen Layout</span>
                <span className="text-gray-700">{formatPrice(KITCHEN_LAYOUT_PRICE[state.kitchenLayout])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kitchen Brand ({state.kitchenBrand.toUpperCase()})</span>
                <span className="text-gray-700">{formatPrice(KITCHEN_BRAND_PRICE[state.kitchenBrand])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Countertop ({state.kitchenCountertop})</span>
                <span className="text-gray-700">{formatPrice(KITCHEN_COUNTERTOP_PRICE[state.kitchenCountertop])}</span>
              </div>
              {state.kitchenAppliances.map((a) => (
                <div key={a} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{a}</span>
                  <span className="text-gray-700">{formatPrice(KITCHEN_APPLIANCE_PRICE[a])}</span>
                </div>
              ))}
              {state.bathFixtures.map((f) => (
                <div key={f} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{f.replace("-", " ")}</span>
                  <span className="text-gray-700">{formatPrice(BATH_FIXTURE_PRICE[f])}</span>
                </div>
              ))}
              {state.livingItems.map((item) => (
                <div key={item} className="flex justify-between">
                  <span className="text-gray-600">{LIVING_LABELS[item]}</span>
                  <span className="text-gray-700">{formatPrice(LIVING_ITEM_PRICE[item])}</span>
                </div>
              ))}
              {state.bedroomItems.map((item) => (
                <div key={item} className="flex justify-between">
                  <span className="text-gray-600">{BEDROOM_LABELS[item]}</span>
                  <span className="text-gray-700">{formatPrice(BEDROOM_ITEM_PRICE[item])}</span>
                </div>
              ))}
              {state.electricalOutlets > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.electricalOutlets} outlets</span><span className="text-gray-700">{formatPrice((state.electricalOutlets * 500))}</span></div>
              )}
              {state.electricalLights > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.electricalLights} lights</span><span className="text-gray-700">{formatPrice((state.electricalLights * 1500))}</span></div>
              )}
              {state.smartHome !== "none" && (
                <div className="flex justify-between"><span className="text-gray-600">{state.smartHome === "knx" ? "KNX System" : "Zigbee Hub"}</span><span className="text-gray-700">{formatPrice(state.smartHome === "knx" ? 15000 : 8000)}</span></div>
              )}
              {state.evCharger && <div className="flex justify-between"><span className="text-gray-600">EV Charger</span><span className="text-gray-700">{formatPrice(5000)}</span></div>}
              {state.windows.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.windows.length} window{state.windows.length > 1 ? "s" : ""}</span><span className="text-gray-700">{formatPrice((state.windows.length * 800))}</span></div>
              )}
              {state.doors.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.doors.length} door{state.doors.length > 1 ? "s" : ""}</span><span className="text-gray-700">{formatPrice((state.doors.length * 600))}</span></div>
              )}
              {state.solarPanels && <div className="flex justify-between text-amber-700"><span>Solar panel array ({(() => { let rm = 6.058*2.438; if (state.containerSize === "40ft") rm = 12.192*2.438; else if (state.containerSize === "double") rm = 12.192*4.876; else if (state.containerSize === "custom") rm = (state.customLength*0.3048)*(state.customWidth*0.3048); return Math.max(1, Math.floor((rm*0.85)/1.7)); })()} panels)</span><span>+{(() => { let rm = 6.058*2.438; if (state.containerSize === "40ft") rm = 12.192*2.438; else if (state.containerSize === "double") rm = 12.192*4.876; else if (state.containerSize === "custom") rm = (state.customLength*0.3048)*(state.customWidth*0.3048); return Math.max(1, Math.floor((rm*0.85)/1.7)) * 3500; })()}</span></div>}
              {state.batterySize !== "none" && <div className="flex justify-between text-green-700"><span>Battery ({state.batterySize} kWh)</span><span>+{formatPrice((parseInt(state.batterySize) * 5000))}</span></div>}
              {state.windTurbine && <div className="flex justify-between text-sky-700"><span>Wind turbine ({state.windTurbineSize} kW)</span><span>+{formatPrice((state.windTurbineSize === "1" ? 30000 : state.windTurbineSize === "3" ? 50000 : 80000))}</span></div>}
              {state.heatPumpType !== "none" && <div className="flex justify-between text-orange-700"><span>Heat pump ({state.heatPumpType})</span><span>+{formatPrice((state.heatPumpType === "air-air" ? 50000 : state.heatPumpType === "air-water" ? 80000 : 150000))}</span></div>}
              {state.deck && <div className="flex justify-between text-amber-700"><span>Deck / terrace</span><span>+{formatPrice(5000)}</span></div>}
              {state.stairs && <div className="flex justify-between text-gray-700"><span>External stairs</span><span>+{formatPrice(5000)}</span></div>}
              {state.balcony && <div className="flex justify-between text-gray-700"><span>Balcony</span><span>+{formatPrice(6000)}</span></div>}
              {state.roofTerrace && <div className="flex justify-between text-gray-700"><span>Roof terrace</span><span>+{formatPrice(7500)}</span></div>}
            </div>

            <hr className="border-gray-200" />

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-gray-900">Estimated Total</span>
              <span className="text-2xl font-extrabold text-emerald-700">{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-gray-400">* All prices eks. mva. Excludes delivery, site prep, and permits</p>

            <div className="space-y-2">
              <button onClick={handleSave}
                className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
                  saved ? "bg-green-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >{saved ? " Design Saved!" : " Save Design"}</button>
              <button onClick={handleOrder}
                className="w-full py-3 rounded-lg text-sm font-semibold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-all"
              >
                Bestill nå — 50% depositum
              </button>

              {showDeposit && !depositPaid && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm font-bold text-amber-800">Depositum — 50%</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Totalpris</span><span className="font-bold text-gray-900">{formatPrice(total)}</span></div>
                    <div className="flex justify-between"><span className="text-amber-700 font-semibold">Depositum (50%)</span><span className="font-bold text-amber-700">{formatPrice(deposit)}</span></div>
                    <div className="flex justify-between border-t border-amber-200 pt-1.5"><span className="text-gray-500">Resterende ved levering</span><span className="font-semibold text-gray-700">{formatPrice(remaining)}</span></div>
                  </div>
                  <p className="text-xs text-amber-600">Alle priser eks. mva</p>
                  <a href={depositPaymentLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-amber-700 transition-all shadow-md">Betal {formatPrice(deposit)} depositum via Stripe</a>
                  <button onClick={handleDepositPaid} className="block w-full rounded-lg border border-amber-300 px-4 py-2 text-center text-xs text-amber-600 hover:bg-amber-100 transition-all">Simuler: Jeg har betalt depositum</button>
                </div>
              )}

              {showLogistics && depositPaid && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3 mt-3">
                  <div className="flex items-center gap-2"><svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg><span className="text-sm font-bold text-emerald-800">Logistikk — Transportvalg</span></div>
                  <p className="text-xs text-emerald-700">Depositum bekreftet! Velg transport for din containerbolig.</p>
                  {!logisticsChoice ? (
                    <div className="space-y-2">
                      <button onClick={() => setLogisticsChoice("self")} className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-3 hover:border-emerald-400 transition-all"><p className="text-sm font-bold text-gray-900"> Jeg ordner transport selv</p><p className="text-xs text-gray-500 mt-0.5">Ingen ekstra kostnad.</p></button>
                      <button onClick={() => setLogisticsChoice("kitozon")} className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-3 hover:border-emerald-400 transition-all"><p className="text-sm font-bold text-gray-900"> Kitozon ordner transport</p><p className="text-xs text-gray-500 mt-0.5">Pris gis etter avtale med konsulent.</p></button>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white border border-emerald-200 p-3">
                      <p className="text-sm font-semibold text-emerald-700">{logisticsChoice === "self" ? " Du ordner transport selv" : " Kitozon ordner transport — konsulent kontakter deg"}</p>
                      <p className="text-xs text-gray-500 mt-1">{logisticsChoice === "self" ? "Ingen ekstra kostnad. Produksjon starter nå." : "Konsulent tar kontakt for transport-avtale."}</p>
                      <button onClick={() => setLogisticsChoice(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">Endre valg</button>
                    </div>
                  )}
                  {logisticsChoice && <div className="rounded-lg bg-emerald-600 p-3 text-white text-center"><p className="text-sm font-bold"> Produksjon starter!</p><p className="text-xs text-emerald-100 mt-1">Din bestilling er bekreftet. Konsulent følger opp videre.</p></div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Solar & CO2 Info Panel ─────────────────────────────

function SolarInfoPanel({ state }: { state: DesignState }) {
  const { annualKwh, co2Saved, panels } = estimateSolar(state);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Kitoslight Connected · Solar &amp; CO2
        </span>
      </div>
      <div className="p-4 space-y-4">
        {!state.solarPanels ? (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500">Add solar panels to see energy and CO2 estimates.</p>
            <p className="text-xs text-gray-400 mt-1">Toggle solar in the Exterior Designer.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">{panels}</p>
                <p className="text-xs text-amber-600 mt-1">Solar Panels</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{annualKwh.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">kWh / year</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{co2Saved.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">kg CO2 saved</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Equivalent trees planted</span>
                <span className="font-semibold text-gray-800">~{Math.round(co2Saved / 21)} per year</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated savings</span>
                <span className="font-semibold text-gray-800">~{formatPrice(Math.round(annualKwh * 0.14))}/yr</span>
              </div>
              <div className="flex justify-between">
                <span>Grid independence</span>
                <span className="font-semibold text-gray-800">{Math.min(100, Math.round((annualKwh / 11000) * 100))}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">Data feeds into Kitoslight dashboard for real-time monitoring &amp; ESG reporting.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Zongosol Page ─────────────────────────────────

function ZongosolPage() {
  const [state, dispatch] = useReducer(designReducer, null, initialDesignState);
  const [activeTab, setActiveTab] = useState<"design" | "exterior" | "energy" | "documentation">("design");
  const [viewMode, setViewMode] = useState<"3d" | "floorplan">("3d");
  const container3DRef = useRef<Container3DHandle>(null);
  const [fullscreenRoomId, setFullscreenRoomId] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ErrorBoundary>
      {fullscreenRoomId ? (
        <RoomFullscreen
          state={state}
          roomId={fullscreenRoomId}
          onClose={() => setFullscreenRoomId(null)}
          onStateChange={(updates) => {
            if (updates.kitchenLayout !== undefined) dispatch({ type: "SET_KITCHEN_LAYOUT", layout: updates.kitchenLayout });
            if (updates.kitchenBrand !== undefined) dispatch({ type: "SET_KITCHEN_BRAND", brand: updates.kitchenBrand });
            if (updates.kitchenCountertop !== undefined) dispatch({ type: "SET_KITCHEN_COUNTERTOP", material: updates.kitchenCountertop });
            if (updates.kitchenAppliances !== undefined) {
              // Replace entire array
              const current = state.kitchenAppliances;
              const next = updates.kitchenAppliances;
              const toRemove = current.filter(a => !next.includes(a));
              const toAdd = next.filter(a => !current.includes(a));
              toRemove.forEach(a => dispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: a }));
              toAdd.forEach(a => dispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: a }));
            }
            if (updates.bathFixtures !== undefined) {
              const current = state.bathFixtures;
              const next = updates.bathFixtures;
              const toRemove = current.filter(f => !next.includes(f));
              const toAdd = next.filter(f => !current.includes(f));
              toRemove.forEach(f => dispatch({ type: "TOGGLE_BATH_FIXTURE", fixture: f }));
              toAdd.forEach(f => dispatch({ type: "TOGGLE_BATH_FIXTURE", fixture: f }));
            }
            if (updates.livingItems !== undefined) {
              const current = state.livingItems;
              const next = updates.livingItems;
              const toRemove = current.filter(i => !next.includes(i));
              const toAdd = next.filter(i => !current.includes(i));
              toRemove.forEach(i => dispatch({ type: "TOGGLE_LIVING_ITEM", item: i }));
              toAdd.forEach(i => dispatch({ type: "TOGGLE_LIVING_ITEM", item: i }));
            }
            if (updates.bedroomItems !== undefined) {
              const current = state.bedroomItems;
              const next = updates.bedroomItems;
              const toRemove = current.filter(i => !next.includes(i));
              const toAdd = next.filter(i => !current.includes(i));
              toRemove.forEach(i => dispatch({ type: "TOGGLE_BEDROOM_ITEM", item: i }));
              toAdd.forEach(i => dispatch({ type: "TOGGLE_BEDROOM_ITEM", item: i }));
            }
          }}
        />
      ) : (
      <main className="flex-1 bg-gray-50">
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-green-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Zongosol <span className="text-emerald-200 font-normal">Container Home Designer</span>
              </h1>
              <p className="mt-1 text-emerald-100 text-sm">
                Configure your sustainable container home — from layout to solar.
              </p>
            </div>
            <button onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-all"
            >Start Over</button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ModelSelector state={state} dispatch={dispatch} />

        <LayoutSelector state={state} dispatch={dispatch} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {viewMode === "3d" ? (
              <Suspense fallback={<div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl"><div className="text-gray-500">Loading 3D viewer...</div></div>}><Container3D ref={container3DRef} state={state} viewMode={viewMode} onViewModeChange={setViewMode} onRoomClick={(roomId) => setFullscreenRoomId(roomId)} tourActive={tourActive} onTourStateChange={setTourActive} /></Suspense>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <button onClick={() => setViewMode("3d")}
                      className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px]"
                    > 3D View</button>
                    <button onClick={() => setViewMode("floorplan")}
                      className="px-3 py-2 text-xs font-medium bg-emerald-600 text-white transition-colors min-h-[44px]"
                    > Floor Plan</button>
                  </div>
                </div>
                <FloorPlan state={state} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTab("design")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "design" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              > Interior</button>
              <button onClick={() => setActiveTab("exterior")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "exterior" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              > Exterior</button>
              <button onClick={() => setActiveTab("energy")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "energy" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              > Energy</button>
              <button onClick={() => setActiveTab("documentation")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "documentation" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              > Docs</button>
            </div>

            {activeTab === "design" && <InteriorPanel state={state} dispatch={dispatch} />}
            {activeTab === "exterior" && <ExteriorPanel state={state} dispatch={dispatch} />}
            {activeTab === "energy" && (
              <EnergyPanel
                energyState={{
                  solarPanels: state.solarPanels,
                  panelType: state.panelType,
                  batterySize: state.batterySize,
                  inverterType: state.inverterType,
                  windTurbine: state.windTurbine,
                  windTurbineSize: state.windTurbineSize,
                  heatPumpType: state.heatPumpType,
                  evCharger: state.evCharger,
                  evChargerPower: state.evChargerPower,
                }}
                onEnergyUpdate={(u) => {
                  if (u.solarPanels !== undefined) dispatch({ type: "TOGGLE_SOLAR" });
                  if (u.panelType !== undefined) dispatch({ type: "SET_PANEL_TYPE", panelType: u.panelType });
                  if (u.batterySize !== undefined) dispatch({ type: "SET_BATTERY_SIZE", batterySize: u.batterySize });
                  if (u.inverterType !== undefined) dispatch({ type: "SET_INVERTER_TYPE", inverterType: u.inverterType });
                  if (u.windTurbine !== undefined) dispatch({ type: "TOGGLE_WIND_TURBINE" });
                  if (u.windTurbineSize !== undefined) dispatch({ type: "SET_WIND_TURBINE_SIZE", windTurbineSize: u.windTurbineSize });
                  if (u.heatPumpType !== undefined) dispatch({ type: "SET_HEAT_PUMP_TYPE", heatPumpType: u.heatPumpType });
                  if (u.evCharger !== undefined) dispatch({ type: "TOGGLE_EV_CHARGER" });
                  if (u.evChargerPower !== undefined) dispatch({ type: "SET_EV_CHARGER_POWER", evChargerPower: u.evChargerPower });
                }}
                containerSize={state.containerSize}
                customLength={state.customLength}
                customWidth={state.customWidth}
                smartHome={state.smartHome}
              />
            )}
            {activeTab === "documentation" && (
              <DocumentationPanel state={state} container3DRef={container3DRef} />
            )}

            <SolarInfoPanel state={state} />
          </div>

          <div>
            <SummaryPanel state={state} dispatch={dispatch} />
          </div>
        </div>

        {/* ── Cross-platform teasers ────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 space-y-4">
          {/* AFER CITY */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl"></span>
                  <h3 className="text-lg font-bold">AFER CITY — Smart City Simulator</h3>
                </div>
                <p className="text-amber-100 text-sm max-w-lg">
                  Place your container home design in a real smart city simulation. Add solar
                  panels, EV chargers, and battery storage — then run energy simulations.
                </p>
              </div>
              <Link
                to="/afercity"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-all duration-200 shadow-lg flex-shrink-0"
              >
                Open AFER CITY
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Dashboard */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-bold">Kitozon Dashboard</h3>
                </div>
                <p className="text-emerald-100 text-sm max-w-lg">
                  Full admin control over all your devices and designs. ESG reporting,
                  IP device integration, and subscription management — requires Dashboard tier.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-lg flex-shrink-0"
              >
                Open Dashboard
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
      )}
    </ErrorBoundary>
  );
}
