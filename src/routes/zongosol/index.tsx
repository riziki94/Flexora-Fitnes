import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Container3DHandle } from "../../components/Container3D";
const Container3D = lazy(() => import("../../components/Container3D"));
import RoomFullscreen from "../../components/RoomFullscreen";
import FurniturePalette, { getFurnitureDef, GRID_SIZE, FURNITURE_CATALOG } from "../../components/FurniturePalette";
import EnergyPanel, { type EnergyState, type PanelType, type BatterySize, type InverterType, type WindSize, type HeatPumpType, type EVChargerPower, DEFAULT_ENERGY_STATE } from "../../components/EnergyPanel";
import DocumentationPanel from "../../components/DocumentationPanel";
import { formatPrice, formatPriceCurrency } from "../../lib/currency";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { useLanguage } from "../../lib/i18n";
import { sendDesignEmail } from "../../lib/zongosol-actions";
import type {
  RoomType,
  ContainerSize,
  ExteriorColor,
  KitchenLayout,
  CountertopMaterial,
  KitchenAppliance,
  BathFixture,
  LivingItem,
  BedroomItem,
  SmartHomeType,
  Wall,
  LayoutType,
  Window_,
  Door_,
  RoomDef,
  DesignState,
  DesignAction,
  FurnitureType,
  PlacedFurniture,
  CabinetStyle,
  CabinetColor,
  SinkType,
  BacksplashType,
  VanityStyle,
  MirrorType,
  ShowerType,
  VoiceAssistant,
  LightFixtureType,
} from "../../types/zongosol";

export const Route = createFileRoute("/zongosol/")({
  component: ZongosolPage,
});

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
    description: "Perfect small home. An open living/bedroom with compact kitchen and bath.",
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
    description: "Full family home with two bedrooms, separate living room, complete kitchen and bath.",
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
    description: "Spacious double-container home. Three bedrooms, two baths, complete kitchen and large living room.",
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
    description: "Design from scratch. Choose container size, room layout and all details yourself.",
    defaultWindows: [{ id: "wc1", wall: "bottom", position: 50 }],
    defaultDoors: [{ id: "dc1", wall: "left", position: 50 }],
  },
];

// ── Price constants ────────────────────────────────────

const COLOR_PRICE: Record<ExteriorColor, number> = { wood: 5000, metal: 3000, white: 0, green: 2000, charcoal: 3500 };
const KITCHEN_LAYOUT_PRICE: Record<KitchenLayout, number> = { "L-shape": 8000, galley: 6000, island: 12000 };
const KITCHEN_COUNTERTOP_PRICE: Record<CountertopMaterial, number> = { wood: 2000, granite: 5000, marble: 7000, laminate: 500, steel: 3000 };
const KITCHEN_APPLIANCE_PRICE: Record<KitchenAppliance, number> = { refrigerator: 4000, oven: 3000, dishwasher: 2500, microwave: 1000, cooktop: 2500 };
const BATH_FIXTURE_PRICE: Record<BathFixture, number> = { shower: 5000, tub: 8000, "double-sink": 3000, toilet: 2000, bidet: 1500 };
const LIVING_ITEM_PRICE: Record<LivingItem, number> = { "sofa-3": 8000, "sofa-2": 5000, sectional: 12000, "coffee-table": 1500, "tv-unit": 3000, "dining-4": 4000, "dining-6": 6000, bookshelf: 2000 };
const BEDROOM_ITEM_PRICE: Record<BedroomItem, number> = { "bed-double": 6000, "bed-queen": 5000, "bed-single": 3000, wardrobe: 4000, nightstand: 1000, desk: 2500 };

// Phase 4: Enhanced kitchen prices
const CABINET_STYLE_PRICE: Record<string, number> = { modern: 5000, classic: 8000, minimal: 3000 };
const CABINET_COLOR_PRICE: Record<string, number> = { white: 0, oak: 3000, walnut: 5000, grey: 1000, navy: 2000 };
const SINK_TYPE_PRICE: Record<string, number> = { single: 1500, "double": 3500, undermount: 4000 };
const BACKSPLASH_PRICE: Record<string, number> = { tile: 3000, glass: 5000, steel: 4000, none: 0 };
const ISLAND_PRICE = 15000;

// Phase 4: Enhanced bathroom prices
const VANITY_STYLE_PRICE: Record<string, number> = { floating: 5000, freestanding: 3000, "wall-mounted": 4000 };
const MIRROR_TYPE_PRICE: Record<string, number> = { standard: 500, led: 2000, medicine: 3000 };
const TOWEL_RAIL_PRICE = 1500;
const SHOWER_TYPE_PRICE: Record<string, number> = { "walk-in": 8000, enclosed: 5000, "over-bath": 3000 };

// Phase 4: Electrical planning prices
const OUTLET_PRICE = 200;
const LIGHT_PRICE: Record<string, number> = { ceiling: 500, track: 800, pendant: 600, sconce: 400 };
const SWITCH_PRICE = 150;
const ELECTRICAL_PANEL_PRICE = 3000;

// Phase 4: Smart home prices
const SMART_THERMOSTAT_PRICE = 3000;
const SMART_LIGHTING_PRICE = 5000;
const SMART_LOCKS_PRICE = 4000;
const SMART_SECURITY_PRICE = 8000;
const VOICE_ASSISTANT_PRICE: Record<string, number> = { none: 0, alexa: 500, google: 500, homekit: 800 };
const SMART_BLINDS_PRICE = 6000;

const LIVING_LABELS: Record<LivingItem, string> = { "sofa-3": "3-Seat Sofa", "sofa-2": "2-Seat Sofa", sectional: "Sectional", "coffee-table": "Coffee Table", "tv-unit": "TV Unit", "dining-4": "Dining (4-seat)", "dining-6": "Dining (6-seat)", bookshelf: "Bookshelf" };
const BEDROOM_LABELS: Record<BedroomItem, string> = { "bed-double": "Double Bed", "bed-queen": "Queen Bed", "bed-single": "Single Bed", wardrobe: "Wardrobe", nightstand: "Nightstand", desk: "Desk" };
const LIVING_ICONS: Record<LivingItem, string> = { "sofa-3": "", "sofa-2": "", sectional: "", "coffee-table": "", "tv-unit": "", "dining-4": "", "dining-6": "", bookshelf: "" };
const BEDROOM_ICONS: Record<BedroomItem, string> = { "bed-double": "", "bed-queen": "", "bed-single": "", wardrobe: "", nightstand: "", desk: "" };

function calcTotal(state: DesignState): number {
  const model = MODELS.find((m) => m.id === state.selectedModel);
  let total = model?.basePrice ?? 0;
  total += COLOR_PRICE[state.exteriorColor];
  total += KITCHEN_LAYOUT_PRICE[state.kitchenLayout] ?? 0;
  total += KITCHEN_COUNTERTOP_PRICE[state.kitchenCountertop] ?? 0;
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
  // Phase 4: Enhanced kitchen
  total += CABINET_STYLE_PRICE[state.cabinetStyle] ?? 0;
  total += CABINET_COLOR_PRICE[state.cabinetColor] ?? 0;
  total += SINK_TYPE_PRICE[state.sinkType] ?? 0;
  total += BACKSPLASH_PRICE[state.backsplash] ?? 0;
  if (state.hasIsland) total += ISLAND_PRICE;
  // Phase 4: Enhanced bathroom
  total += VANITY_STYLE_PRICE[state.vanityStyle] ?? 0;
  total += MIRROR_TYPE_PRICE[state.mirrorType] ?? 0;
  if (state.hasTowelRail) total += TOWEL_RAIL_PRICE;
  total += SHOWER_TYPE_PRICE[state.showerType] ?? 0;
  // Phase 4: Electrical planning
  total += state.electrical.outlets.length * OUTLET_PRICE;
  total += state.electrical.lights.reduce((s, l) => s + (LIGHT_PRICE[l.lightType] ?? 0), 0);
  total += state.electrical.switches.length * SWITCH_PRICE;
  if (state.electrical.panel) total += ELECTRICAL_PANEL_PRICE;
  // Phase 4: Smart home
  if (state.smartThermostat) total += SMART_THERMOSTAT_PRICE;
  if (state.smartLighting) total += SMART_LIGHTING_PRICE;
  if (state.smartLocks) total += SMART_LOCKS_PRICE;
  if (state.smartSecurity) total += SMART_SECURITY_PRICE;
  total += VOICE_ASSISTANT_PRICE[state.voiceAssistant] ?? 0;
  if (state.smartBlinds) total += SMART_BLINDS_PRICE;
  return total;
}

// ── Reducer ────────────────────────────────────────────

const STORAGE_KEY = "kitozon-zongosol-design";

const DEFAULT_DESIGN_STATE: DesignState = {
  selectedModel: null, containerSize: "20ft", customLength: 20, customWidth: 8,
  rooms: [], windows: [], doors: [],
  exteriorColor: "white", solarPanels: false, deck: false,
  kitchenAppliances: ["refrigerator", "cooktop"],
  kitchenLayout: "L-shape", kitchenCountertop: "laminate",
  bathFixtures: ["shower", "toilet"],
  livingItems: [], bedroomItems: [],
  electricalOutlets: 8, electricalLights: 4,
  smartHome: "none", evCharger: false,
  // Phase 4: Enhanced kitchen
  cabinetStyle: "modern" as const, cabinetColor: "white" as const, sinkType: "single" as const, backsplash: "none" as const, hasIsland: false,
  // Phase 4: Enhanced bathroom
  vanityStyle: "freestanding" as const, mirrorType: "standard" as const, hasTowelRail: false, showerType: "enclosed" as const,
  // Phase 4: Electrical planning
  electrical: { outlets: [], lights: [], switches: [], panel: false },
  // Phase 4: Smart home
  smartThermostat: false, smartLighting: false, smartLocks: false, smartSecurity: false, voiceAssistant: "none" as const, smartBlinds: false,
  layoutType: "single", stairs: false, balcony: false, roofTerrace: false,
  panelType: "standard", batterySize: "none", inverterType: "string",
  windTurbine: false, windTurbineSize: "1", heatPumpType: "none", evChargerPower: "7.4",
  placedFurniture: [],
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

function designReducer(state: DesignState, action: DesignAction): DesignState {
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
    // Furniture drag & drop
    case "PLACE_FURNITURE": return { ...state, placedFurniture: [...state.placedFurniture, action.furniture] };
    case "MOVE_FURNITURE": return { ...state, placedFurniture: state.placedFurniture.map(f => f.id === action.id ? { ...f, x: action.x, y: action.y } : f) };
    case "REMOVE_FURNITURE": return { ...state, placedFurniture: state.placedFurniture.filter(f => f.id !== action.id) };
    case "ROTATE_FURNITURE": return { ...state, placedFurniture: state.placedFurniture.map(f => f.id === action.id ? { ...f, rotation: ((f.rotation + 90) % 360) as 0|90|180|270 } : f) };
    case "CLEAR_ALL_FURNITURE": return { ...state, placedFurniture: [] };
    // Phase 4: Enhanced kitchen
    case "SET_CABINET_STYLE": return { ...state, cabinetStyle: action.style };
    case "SET_CABINET_COLOR": return { ...state, cabinetColor: action.color };
    case "SET_SINK_TYPE": return { ...state, sinkType: action.sinkType };
    case "SET_BACKSPLASH": return { ...state, backsplash: action.backsplash };
    case "TOGGLE_ISLAND": return { ...state, hasIsland: !state.hasIsland };
    // Phase 4: Enhanced bathroom
    case "SET_VANITY_STYLE": return { ...state, vanityStyle: action.style };
    case "SET_MIRROR_TYPE": return { ...state, mirrorType: action.mirrorType };
    case "TOGGLE_TOWEL_RAIL": return { ...state, hasTowelRail: !state.hasTowelRail };
    case "SET_SHOWER_TYPE": return { ...state, showerType: action.showerType };
    // Phase 4: Electrical planning
    case "ADD_ELECTRICAL_OUTLET": return { ...state, electrical: { ...state.electrical, outlets: [...state.electrical.outlets, { id: `eo${Date.now()}`, wall: action.wall, position: 50 }] } };
    case "REMOVE_ELECTRICAL_OUTLET": return { ...state, electrical: { ...state.electrical, outlets: state.electrical.outlets.filter(o => o.id !== action.id) } };
    case "ADD_LIGHT": return { ...state, electrical: { ...state.electrical, lights: [...state.electrical.lights, { id: `el${Date.now()}`, lightType: action.lightType, wall: action.wall, position: 50 }] } };
    case "REMOVE_LIGHT": return { ...state, electrical: { ...state.electrical, lights: state.electrical.lights.filter(l => l.id !== action.id) } };
    case "ADD_SWITCH": return { ...state, electrical: { ...state.electrical, switches: [...state.electrical.switches, { id: `es${Date.now()}`, wall: action.wall, position: 50 }] } };
    case "REMOVE_SWITCH": return { ...state, electrical: { ...state.electrical, switches: state.electrical.switches.filter(s => s.id !== action.id) } };
    case "TOGGLE_ELECTRICAL_PANEL": return { ...state, electrical: { ...state.electrical, panel: !state.electrical.panel } };
    // Phase 4: Smart home
    case "TOGGLE_SMART_THERMOSTAT": return { ...state, smartThermostat: !state.smartThermostat };
    case "TOGGLE_SMART_LIGHTING": return { ...state, smartLighting: !state.smartLighting };
    case "TOGGLE_SMART_LOCKS": return { ...state, smartLocks: !state.smartLocks };
    case "TOGGLE_SMART_SECURITY": return { ...state, smartSecurity: !state.smartSecurity };
    case "SET_VOICE_ASSISTANT": return { ...state, voiceAssistant: action.assistant };
    case "TOGGLE_SMART_BLINDS": return { ...state, smartBlinds: !state.smartBlinds };
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

const EXTERIOR_LABEL_KEYS: Record<ExteriorColor, string> = {
  wood: "zongosol.naturalWood", metal: "zongosol.brushedMetal", white: "zongosol.classicWhite", green: "zongosol.forestGreen", charcoal: "zongosol.charcoal",
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

function FloorPlan({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!state.selectedModel) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center px-6">
          <svg className="mx-auto h-14 w-14 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-sm font-medium">{t("zongosol.selectModelPrompt")}</p>
          <p className="text-xs mt-1 text-gray-400">{t("zongosol.floorPlanHere")}</p>
        </div>
      </div>
    );
  }

  const containerH = state.containerSize === "40ft" ? 400 : state.containerSize === "double" ? 260 : state.containerSize === "custom" ? 350 : 240;
  const containerW = state.containerSize === "double" ? 200 : 120;
  const layout = getRoomLayout(state.rooms, state.containerSize);

  // Grid snap helper
  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  // Check if position is within a room
  function getRoomAt(x: number, y: number) {
    return layout.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }

  function isWithinBounds(x: number, y: number, w: number, h: number) {
    // Check if center is within any room
    const cx = x + w / 2;
    const cy = y + h / 2;
    const room = getRoomAt(cx, cy);
    if (!room) return false;
    // Also check all corners are within container
    if (x < 0 || y < 0 || x + w > containerW || y + h > containerH) return false;
    return true;
  }

  // Handle drop from palette
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const furnType = e.dataTransfer.getData("text/plain") as FurnitureType;
    const def = getFurnitureDef(furnType);
    if (!def || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const viewBoxW = containerW;
    const viewBoxH = containerH;
    const scaleX = viewBoxW / svgRect.width;
    const scaleY = viewBoxH / svgRect.height;

    let x = (e.clientX - svgRect.left) * scaleX - def.defaultW / 2;
    let y = (e.clientY - svgRect.top) * scaleY - def.defaultH / 2;

    // Snap to grid
    x = snapToGrid(x);
    y = snapToGrid(y);

    // Clamp to container
    x = Math.max(0, Math.min(containerW - def.defaultW, x));
    y = Math.max(0, Math.min(containerH - def.defaultH, y));

    const newFurniture: PlacedFurniture = {
      id: `furn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: furnType,
      x,
      y,
      width: def.defaultW,
      height: def.defaultH,
      rotation: 0,
      color: def.color,
    };

    dispatch({ type: "PLACE_FURNITURE", furniture: newFurniture });
  }, [containerW, containerH, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Click-to-move within SVG
  const handleSVGMouseDown = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = containerW / svgRect.width;
    const scaleY = containerH / svgRect.height;
    const mx = (e.clientX - svgRect.left) * scaleX;
    const my = (e.clientY - svgRect.top) * scaleY;

    // Check if click hits a placed furniture
    const hit = state.placedFurniture.findLast(f => {
      const fw = f.rotation === 90 || f.rotation === 270 ? f.height : f.width;
      const fh = f.rotation === 90 || f.rotation === 270 ? f.width : f.height;
      return mx >= f.x && mx <= f.x + fw && my >= f.y && my <= f.y + fh;
    });

    if (hit) {
      setSelectedId(hit.id);
      setDraggingId(hit.id);
      setDragOffset({ x: mx - hit.x, y: my - hit.y });
    } else {
      setSelectedId(null);
      setDraggingId(null);
    }
  }, [state.placedFurniture, containerW, containerH]);

  const handleSVGMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current || !dragOffset) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = containerW / svgRect.width;
    const scaleY = containerH / svgRect.height;
    let mx = (e.clientX - svgRect.left) * scaleX - dragOffset.x;
    let my = (e.clientY - svgRect.top) * scaleY - dragOffset.y;

    // Snap to grid
    mx = snapToGrid(mx);
    my = snapToGrid(my);

    const furn = state.placedFurniture.find(f => f.id === draggingId);
    if (!furn) return;
    const fw = furn.rotation === 90 || furn.rotation === 270 ? furn.height : furn.width;
    const fh = furn.rotation === 90 || furn.rotation === 270 ? furn.width : furn.height;

    // Clamp to container
    mx = Math.max(0, Math.min(containerW - fw, mx));
    my = Math.max(0, Math.min(containerH - fh, my));

    dispatch({ type: "MOVE_FURNITURE", id: draggingId, x: mx, y: my });
  }, [draggingId, dragOffset, dispatch, state.placedFurniture, containerW, containerH]);

  const handleSVGMouseUp = useCallback(() => {
    setDraggingId(null);
    setDragOffset(null);
  }, []);

  // Keyboard: Delete to remove selected
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (selectedId) {
          dispatch({ type: "REMOVE_FURNITURE", id: selectedId });
          setSelectedId(null);
        }
      }
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && selectedId) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        dispatch({ type: "ROTATE_FURNITURE", id: selectedId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, dispatch]);

  const handleClearAll = () => {
    dispatch({ type: "CLEAR_ALL_FURNITURE" });
    setSelectedId(null);
  };

  // Count furniture
  const livingCount = state.placedFurniture.filter(f => 
    FURNITURE_CATALOG.find(d => d.type === f.type)?.category === "living"
  ).length;
  const bedroomCount = state.placedFurniture.filter(f => 
    FURNITURE_CATALOG.find(d => d.type === f.type)?.category === "bedroom"
  ).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          {t("zongosol.floorPlanOf", { name: MODELS.find((m) => m.id === state.selectedModel)?.name ?? "" })}
          <span className="text-xs font-normal text-gray-400 ml-1">
            {t("zongosol.itemsPlaced", { count: state.placedFurniture.length })}
          </span>
        </span>
        <div className="flex items-center gap-1">
          {selectedId && (
            <>
              <button onClick={() => { dispatch({ type: "ROTATE_FURNITURE", id: selectedId }); }}
                className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-blue-50 text-blue-600 font-medium"
                title="Rotate (R)"
              >{t("zongosol.rotateBtn")}</button>
              <button onClick={() => { dispatch({ type: "REMOVE_FURNITURE", id: selectedId }); setSelectedId(null); }}
                className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-red-50 text-red-600 font-medium"
                title="Delete (Del)"
              >{t("zongosol.deleteBtn")}</button>
            </>
          )}
          {state.placedFurniture.length > 0 && (
            <button onClick={handleClearAll}
              className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-red-50 text-red-500 font-medium"
            >{t("zongosol.clearAllBtn")}</button>
          )}
        </div>
      </div>
      <div className="flex">
        {/* Furniture Palette Sidebar — hidden on mobile */}
        <div className="hidden md:block flex-shrink-0">
          <FurniturePalette onDragStart={() => {}} />
        </div>

        {/* SVG Floor Plan */}
        <div className="min-w-0 flex-1 p-4 bg-[#f8fafc]" 
          onDrop={handleDrop} onDragOver={handleDragOver}
        >
          <svg ref={svgRef}
            viewBox={`0 0 ${containerW} ${containerH}`}
            className="w-full"
            style={{ maxHeight: "500px", cursor: draggingId ? "grabbing" : "default" }}
            onMouseDown={handleSVGMouseDown}
            onMouseMove={handleSVGMouseMove}
            onMouseUp={handleSVGMouseUp}
            onMouseLeave={handleSVGMouseUp}
          >
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={containerW} height={containerH} fill="url(#grid)" rx="2" />
            <rect x="4" y="4" width={containerW - 8} height={containerH - 8} fill="none" stroke="#94a3b8" strokeWidth="3" rx="4" strokeDasharray="8 3" />
            
            {/* Room layout */}
            {layout.map(({ x, y, w, h, room }) => (
              <g key={room.id}>
                <rect x={x} y={y} width={w} height={h} fill={ROOM_SVG[room.type].fill} stroke={ROOM_SVG[room.type].stroke} strokeWidth="2" rx="3" />
                <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={room.type === "bathroom" ? "6" : "7"} fontWeight="600" fill={ROOM_SVG[room.type].stroke} fontFamily="system-ui">{room.label}</text>
              </g>
            ))}

            {/* Windows */}
            {state.windows.map((win) => {
              let wx: number, wy: number, ww: number, wh: number;
              const winSize = 8;
              if (win.wall === "top") { wx = 4 + (containerW - 8) * (win.position / 100) - winSize / 2; wy = 4 - 2; ww = winSize; wh = 4; }
              else if (win.wall === "bottom") { wx = 4 + (containerW - 8) * (win.position / 100) - winSize / 2; wy = containerH - 4 - 2; ww = winSize; wh = 4; }
              else if (win.wall === "left") { wx = 4 - 2; wy = 4 + (containerH - 8) * (win.position / 100) - winSize / 2; ww = 4; wh = winSize; }
              else { wx = containerW - 4 - 2; wy = 4 + (containerH - 8) * (win.position / 100) - winSize / 2; ww = 4; wh = winSize; }
              return <rect key={win.id} x={wx} y={wy} width={ww} height={wh} fill="#38bdf8" stroke="#0284c7" strokeWidth="1" rx="1" />;
            })}

            {/* Doors */}
            {state.doors.map((door) => {
              let dx: number, dy: number, dw: number, dh: number;
              const doorSize = 6;
              if (door.wall === "top") { dx = 4 + (containerW - 8) * (door.position / 100) - doorSize / 2; dy = 4 - 2; dw = doorSize; dh = 4; }
              else if (door.wall === "bottom") { dx = 4 + (containerW - 8) * (door.position / 100) - doorSize / 2; dy = containerH - 4 - 2; dw = doorSize; dh = 4; }
              else if (door.wall === "left") { dx = 4 - 2; dy = 4 + (containerH - 8) * (door.position / 100) - doorSize / 2; dw = 4; dh = doorSize; }
              else { dx = containerW - 4 - 2; dy = 4 + (containerH - 8) * (door.position / 100) - doorSize / 2; dw = 4; dh = doorSize; }
              return <rect key={door.id} x={dx} y={dy} width={dw} height={dh} fill="#ef4444" stroke="#b91c1c" strokeWidth="1" rx="1" />;
            })}

            {/* Placed Furniture */}
            {state.placedFurniture.map((furn) => {
              const def = getFurnitureDef(furn.type);
              const isSelected = furn.id === selectedId;
              // Handle rotation: swap w/h for 90/270
              const fw = furn.rotation === 90 || furn.rotation === 270 ? furn.height : furn.width;
              const fh = furn.rotation === 90 || furn.rotation === 270 ? furn.width : furn.height;
              const cx = furn.x + fw / 2;
              const cy = furn.y + fh / 2;
              return (
                <g key={furn.id} style={{ cursor: "move" }}>
                  {/* Shadow/hitbox */}
                  <rect
                    x={furn.x} y={furn.y} width={fw} height={fh}
                    fill={furn.color} fillOpacity={0.8}
                    stroke={isSelected ? "#3b82f6" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isSelected ? 2.5 : 1}
                    rx="2"
                  />
                  {/* Selection handles */}
                  {isSelected && (
                    <>
                      <rect x={furn.x} y={furn.y} width={fw} height={fh} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 2" rx="2" />
                      {[ 
                        [furn.x - 3, furn.y - 3],
                        [furn.x + fw - 3, furn.y - 3],
                        [furn.x - 3, furn.y + fh - 3],
                        [furn.x + fw - 3, furn.y + fh - 3],
                      ].map(([hx, hy], i) => (
                        <rect key={i} x={hx} y={hy} width="6" height="6" fill="white" stroke="#3b82f6" strokeWidth="1.5" rx="1" />
                      ))}
                    </>
                  )}
                  {/* Icon label */}
                  <text
                    x={cx} y={cy}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="9"
                    fill={isSelected ? "#1e40af" : "#374151"}
                    fontWeight={isSelected ? "700" : "500"}
                    fontFamily="system-ui"
                    style={{ pointerEvents: "none" }}
                  >
                    {def?.icon || "📦"}
                  </text>
                  {/* Label below */}
                  <text
                    x={cx} y={cy + 11}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="6"
                    fill="#6b7280"
                    fontFamily="system-ui"
                    style={{ pointerEvents: "none" }}
                  >
                    {def?.label || furn.type}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 text-xs">
        {(["kitchen", "bathroom", "living", "bedroom"] as RoomType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ROOM_SVG[type].fill, border: `1.5px solid ${ROOM_SVG[type].stroke}` }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2"><span className="inline-block w-3 h-3 rounded-sm bg-sky-400 border border-sky-600" />{t("zongosol.window")}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500 border border-red-700" />{t("zongosol.door")}</span>
        <span className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] text-gray-500">🪑 Furniture: <b className="text-emerald-600">{livingCount}</b> living · <b className="text-purple-600">{bedroomCount}</b> bedroom</span>
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-gray-400 text-[10px]">
          {t("zongosol.dragHint")}
        </span>
      </div>
    </div>
  );
}
function ModelSelector({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const { t, currency } = useLanguage();
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
          <svg className="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t("zongosol.chooseModel")}</h2>
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
                <span className={`text-sm font-bold ${selected ? "text-emerald-700" : "text-gray-900"}`}>{t(`zongosol.${model.id}`)}</span>
                {selected && (
                  <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{t(`zongosol.${model.id === "studio" ? "compactCozy" : model.id === "family" ? "twoBedroom" : model.id === "premium" ? "doubleWide" : "buildYourOwn"}`)}</p>
              <p className="text-xs text-gray-500 mb-1">{model.size === "20ft" ? t("zongosol.modelDetails20ft") : model.size === "40ft" ? t("zongosol.modelDetails40ft") : model.size === "double" ? t("zongosol.modelDetailsDouble") : t("zongosol.modelDetailsCustom")}{" · "}{t("zongosol.roomsLabel", { n: model.rooms.length })}</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{t(model.description)}</p>
              <p className="text-lg font-bold text-emerald-700">{formatPriceCurrency(model.basePrice, currency)}</p>
              <p className="text-xs text-gray-400">{t("zongosol.startingPriceExclVat")}</p>
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

function LayoutSelector({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const { t } = useLanguage();
  if (!state.selectedModel) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
          <svg className="h-4 w-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t("zongosol.buildingLayout")}</h2>
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
              <span className={`text-xs font-bold ${selected ? "text-blue-700" : "text-gray-700"}`}>{t(`zongosol.layout${opt.value === "single" ? "Single" : opt.value === "side-by-side" ? "SideBySide" : opt.value === "l-shape" ? "LShape" : opt.value === "u-shape" ? "UShape" : "Stacked"}`)}</span>
              <span className="text-[10px] text-gray-400">{t(`zongosol.layout${opt.value === "single" ? "OneContainer" : opt.value === "side-by-side" ? "TwoAdjacent" : opt.value === "l-shape" ? "TwoPerpendicular" : opt.value === "u-shape" ? "ThreeU" : "TwoStory"}`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const COUNTERTOP_SWATCHES: { value: CountertopMaterial; label: string; color: string; price: number }[] = [
  { value: "wood", label: "zongosol.wood", color: "#8B5E3C", price: 5000 },
  { value: "granite", label: "zongosol.granite", color: "#4A4A4A", price: 15000 },
  { value: "marble", label: "zongosol.marble", color: "#F5F5F0", price: 20000 },
  { value: "laminate", label: "zongosol.laminate", color: "#E5E7EB", price: 2000 },
  { value: "steel", label: "zongosol.steel", color: "#9CA3AF", price: 8000 },
];

const APPLIANCE_LIST: { value: KitchenAppliance; label: string; icon: string }[] = [
  { value: "refrigerator", label: "zongosol.refrigerator", icon: "" },
  { value: "oven", label: "zongosol.oven", icon: "" },
  { value: "dishwasher", label: "zongosol.dishwasher", icon: "" },
  { value: "microwave", label: "zongosol.microwave", icon: "" },
  { value: "cooktop", label: "zongosol.cooktop", icon: "" },
];

// ── Interior Designer Panel ────────────────────────────

function InteriorPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const { t, currency } = useLanguage();
  const [tab, setTab] = useState<"kitchen" | "bathroom" | "furniture" | "electrical" | "smart" | "windows" | "doors" | "size">("kitchen");
  const wallOptions: { value: Wall; label: string }[] = [
    { value: "top", label: "Top Wall" }, { value: "bottom", label: "Bottom Wall" },
    { value: "left", label: "Left Wall" }, { value: "right", label: "Right Wall" },
  ];

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: "kitchen", label: t("zongosol.kitchenTab"), icon: "" },
    { key: "bathroom", label: t("zongosol.bathroomTab"), icon: "" },
    { key: "furniture", label: t("zongosol.furnitureTab"), icon: "" },
    { key: "electrical", label: t("zongosol.electricalTab"), icon: "" },
    { key: "windows", label: t("zongosol.windowsTab"), icon: "" },
    { key: "doors", label: t("zongosol.doorsTab"), icon: "" },
    { key: "size", label: t("zongosol.sizeTab"), icon: "" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {t("zongosol.interiorDesigner")}
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
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.kitchenLayoutLabel")}</label>
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
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.countertopMaterial")}</label>
              <div className="flex gap-2 flex-wrap">
                {COUNTERTOP_SWATCHES.map((sw) => (
                  <button key={sw.value} onClick={() => dispatch({ type: "SET_KITCHEN_COUNTERTOP", material: sw.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      state.kitchenCountertop === sw.value ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: sw.color }} />
                    {t(sw.label)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.appliancesLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {APPLIANCE_LIST.map((app) => {
                  const active = state.kitchenAppliances.includes(app.value);
                  return (
                    <button key={app.value} onClick={() => dispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: app.value })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    ><span>{app.icon}</span> {t(app.label)} {active && ""}</button>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Phase 4: Cabinet Style */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.cabinetStyle")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["modern","classic","minimal"] as string[]).map((s) => (
                  <button key={s} onClick={() => dispatch({ type: "SET_CABINET_STYLE", style: s as any })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.cabinetStyle === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Cabinet Color */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.cabinetColor")}</label>
              <div className="flex flex-wrap gap-2">
                {(["white","oak","walnut","grey","navy"] as string[]).map((c) => (
                  <button key={c} onClick={() => dispatch({ type: "SET_CABINET_COLOR", color: c as any })}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      state.cabinetColor === c ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >{c.charAt(0).toUpperCase() + c.slice(1)}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Sink Type */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">{t("zongosol.sinkType")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["single","double","undermount"] as string[]).map((s) => (
                  <button key={s} onClick={() => dispatch({ type: "SET_SINK_TYPE", sinkType: s as any })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.sinkType === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{s === "single" ? "Single Basin" : s === "double" ? "Double Basin" : "Undermount"}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Backsplash */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Backsplash</label>
              <div className="flex flex-wrap gap-2">
                {(["tile","glass","steel","none"] as string[]).map((b) => (
                  <button key={b} onClick={() => dispatch({ type: "SET_BACKSPLASH", backsplash: b as any })}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      state.backsplash === b ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >{b === "none" ? "None" : b === "tile" ? "Tile" : b === "glass" ? "Glass" : "Steel"}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Kitchen Island */}
            <button onClick={() => dispatch({ type: "TOGGLE_ISLAND" })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                state.hasIsland ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🏝️</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Kitchen Island</p>
                  <p className="text-xs text-gray-500">With seating · +{formatPriceCurrency(15000, currency)}</p>
                </div>
              </div>
              <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.hasIsland ? "bg-emerald-500" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.hasIsland ? "translate-x-5" : "translate-x-1"}`} />
              </span>
            </button>
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
                        <p className="text-xs text-gray-500">{fixture.desc} · {formatPriceCurrency(fixture.price, currency)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${active ? "bg-blue-500" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            <hr className="border-gray-200" />

            {/* Phase 4: Vanity Style */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Vanity Style</label>
              <div className="grid grid-cols-3 gap-2">
                {(["floating","freestanding","wall-mounted"] as string[]).map((s) => (
                  <button key={s} onClick={() => dispatch({ type: "SET_VANITY_STYLE", style: s as any })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.vanityStyle === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{s === "wall-mounted" ? "Wall-mount" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Mirror Type */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Mirror Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["standard","led","medicine"] as string[]).map((m) => (
                  <button key={m} onClick={() => dispatch({ type: "SET_MIRROR_TYPE", mirrorType: m as any })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.mirrorType === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{m === "standard" ? "Standard" : m === "led" ? "LED Backlit" : "Med Cabinet"}</button>
                ))}
              </div>
            </div>

            {/* Phase 4: Heated Towel Rail */}
            <button onClick={() => dispatch({ type: "TOGGLE_TOWEL_RAIL" })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                state.hasTowelRail ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🪮</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Heated Towel Rail</p>
                  <p className="text-xs text-gray-500">+{formatPriceCurrency(1500, currency)}</p>
                </div>
              </div>
              <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.hasTowelRail ? "bg-blue-500" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.hasTowelRail ? "translate-x-5" : "translate-x-1"}`} />
              </span>
            </button>

            {/* Phase 4: Shower Type */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Shower Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["walk-in","enclosed","over-bath"] as string[]).map((s) => (
                  <button key={s} onClick={() => dispatch({ type: "SET_SHOWER_TYPE", showerType: s as any })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      state.showerType === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >{s === "walk-in" ? "Walk-in" : s === "enclosed" ? "Enclosed" : "Over-bath"}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Furniture Tab */}
        {tab === "furniture" && (
          <div className="space-y-5">
            {/* Living Room */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">{t("zongosol.livingRoom")} <span className="text-gray-400 font-normal">({state.livingItems.length} items)</span></label>
                {state.livingItems.length > 0 && (
                  <button onClick={() => dispatch({ type: "CLEAR_LIVING" })} className="text-xs text-red-500 hover:text-red-700 font-medium">{t("zongosol.clearRoom")}</button>
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
                      <span className="text-[10px] text-gray-400">{formatPriceCurrency(LIVING_ITEM_PRICE[item], currency)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Bedroom */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">{t("zongosol.bedroom")} <span className="text-gray-400 font-normal">({state.bedroomItems.length} items)</span></label>
                {state.bedroomItems.length > 0 && (
                  <button onClick={() => dispatch({ type: "CLEAR_BEDROOM" })} className="text-xs text-red-500 hover:text-red-700 font-medium">{t("zongosol.clearRoom")}</button>
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
                      <span className="text-[10px] text-gray-400">{formatPriceCurrency(BEDROOM_ITEM_PRICE[item], currency)}</span>
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
                <span className="text-xs text-gray-500">× {currency === "NOK" ? "500 kr" : "$47.62"} = {formatPriceCurrency((state.electricalOutlets * 500), currency)}</span>
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
                <span className="text-xs text-gray-500">× {currency === "NOK" ? "1 500 kr" : "$142.86"} = {formatPriceCurrency((state.electricalLights * 1500), currency)}</span>
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
                    {opt.value !== "none" && <span className="text-[10px] text-gray-400">+{formatPriceCurrency((opt as any).price, currency)}</span>}
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
                  <p className="text-xs text-gray-500">Wall-mounted charger · +{formatPriceCurrency(8000, currency)}</p>
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
                  Electrical total: {formatPriceCurrency((state.electricalOutlets * 500 + state.electricalLights * 1500 + (state.smartHome === "knx" ? 15000 : state.smartHome === "zigbee" ? 8000 : 0) + (state.evCharger ? 8000 : 0)), currency)}
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

function ExteriorPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const { t, currency } = useLanguage();
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          {t("zongosol.exteriorDesigner")}
        </span>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-3">{t("zongosol.exteriorMaterial")}</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(EXTERIOR_CSS) as ExteriorColor[]).map((color) => (
              <button key={color} onClick={() => dispatch({ type: "SET_EXTERIOR_COLOR", color })}
                className="flex flex-col items-center gap-1" title={t(EXTERIOR_LABEL_KEYS[color])}
              >
                <span className={`inline-block w-10 h-10 rounded-lg border-2 transition-all ${
                    state.exteriorColor === color ? "border-emerald-500 ring-2 ring-emerald-200 scale-110" : "border-gray-300"
                  } ${EXTERIOR_CSS[color]}`}
                />
                <span className="text-[10px] text-gray-500 leading-tight text-center">{t(EXTERIOR_LABEL_KEYS[color])}</span>
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
          <p className="text-xs text-center mt-2 opacity-80">{state.solarPanels ? "Solar · " : ""}{state.deck ? "Deck · " : ""}{t(EXTERIOR_LABEL_KEYS[state.exteriorColor])}</p>
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
                <p className="text-xs text-gray-500">+{formatPriceCurrency(15000, currency)} · Rooftop array</p>
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
                <p className="text-xs text-gray-500">+{formatPriceCurrency(8000, currency)} · Outdoor living</p>
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

function SummaryPanel({ state, dispatch }: { state: DesignState; dispatch: React.Dispatch<DesignAction> }) {
  const total = calcTotal(state);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const { t, currency } = useLanguage();
  const isNok = currency === "NOK";
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
    setShowSaveForm(true);
  }, [state]);

  const handleSendDesign = useCallback(async () => {
    setSending(true);
    setSendError(null);
    try {
      const designWithTotal = { ...state, _totalEstimate: total };
      const result = await sendDesignEmail({
        data: {
          design: designWithTotal,
          customerName: customerName || undefined,
          customerEmail: customerEmail || undefined,
        },
      });
      if (result.success) {
        setSaved(true);
        setShowSaveForm(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSendError("Failed to send. Please try again.");
      }
    } catch (err) {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }, [state, total, customerName, customerEmail]);

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
          {t("zongosol.orderSummary")}
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
                <span className="font-medium text-gray-800">{formatPriceCurrency(model?.basePrice, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Layout</span>
                <span className="text-gray-700 capitalize">{state.layoutType.replace("-", " ")}</span>
              </div>
              {state.exteriorColor !== "white" && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t(EXTERIOR_LABEL_KEYS[state.exteriorColor])} exterior</span>
                  <span className="text-gray-700">+{formatPriceCurrency(COLOR_PRICE[state.exteriorColor], currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Kitchen Layout</span>
                <span className="text-gray-700">{formatPriceCurrency(KITCHEN_LAYOUT_PRICE[state.kitchenLayout], currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Countertop ({state.kitchenCountertop})</span>
                <span className="text-gray-700">{formatPriceCurrency(KITCHEN_COUNTERTOP_PRICE[state.kitchenCountertop], currency)}</span>
              </div>
              {state.kitchenAppliances.map((a) => (
                <div key={a} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{a}</span>
                  <span className="text-gray-700">{formatPriceCurrency(KITCHEN_APPLIANCE_PRICE[a], currency)}</span>
                </div>
              ))}
              {state.bathFixtures.map((f) => (
                <div key={f} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{f.replace("-", " ")}</span>
                  <span className="text-gray-700">{formatPriceCurrency(BATH_FIXTURE_PRICE[f], currency)}</span>
                </div>
              ))}
              {state.livingItems.map((item) => (
                <div key={item} className="flex justify-between">
                  <span className="text-gray-600">{LIVING_LABELS[item]}</span>
                  <span className="text-gray-700">{formatPriceCurrency(LIVING_ITEM_PRICE[item], currency)}</span>
                </div>
              ))}
              {state.bedroomItems.map((item) => (
                <div key={item} className="flex justify-between">
                  <span className="text-gray-600">{BEDROOM_LABELS[item]}</span>
                  <span className="text-gray-700">{formatPriceCurrency(BEDROOM_ITEM_PRICE[item], currency)}</span>
                </div>
              ))}
              {state.electrical.outlets.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.electrical.outlets.length} outlets</span><span className="text-gray-700">{formatPriceCurrency((state.electrical.outlets.length * OUTLET_PRICE), currency)}</span></div>
              )}
              {state.electrical.lights.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.electrical.lights.length} lights</span><span className="text-gray-700">{formatPriceCurrency(state.electrical.lights.reduce((s, l) => s + (LIGHT_PRICE[l.lightType] ?? 0), 0), currency)}</span></div>
              )}
              {state.electrical.switches.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.electrical.switches.length} switches</span><span className="text-gray-700">{formatPriceCurrency((state.electrical.switches.length * SWITCH_PRICE), currency)}</span></div>
              )}
              {state.electrical.panel && <div className="flex justify-between"><span className="text-gray-600">Electrical panel</span><span className="text-gray-700">{formatPriceCurrency(ELECTRICAL_PANEL_PRICE, currency)}</span></div>}
              {state.evCharger && <div className="flex justify-between"><span className="text-gray-600">EV Charger</span><span className="text-gray-700">{formatPriceCurrency(8000, currency)}</span></div>}
              {state.smartThermostat && <div className="flex justify-between text-orange-700"><span>Smart thermostat</span><span>+{formatPriceCurrency(SMART_THERMOSTAT_PRICE, currency)}</span></div>}
              {state.smartLighting && <div className="flex justify-between text-yellow-700"><span>Smart lighting</span><span>+{formatPriceCurrency(SMART_LIGHTING_PRICE, currency)}</span></div>}
              {state.smartLocks && <div className="flex justify-between text-blue-700"><span>Smart locks</span><span>+{formatPriceCurrency(SMART_LOCKS_PRICE, currency)}</span></div>}
              {state.smartSecurity && <div className="flex justify-between text-red-700"><span>Security system</span><span>+{formatPriceCurrency(SMART_SECURITY_PRICE, currency)}</span></div>}
              {state.voiceAssistant !== "none" && <div className="flex justify-between text-purple-700"><span>Voice ({state.voiceAssistant})</span><span>+{formatPriceCurrency(VOICE_ASSISTANT_PRICE[state.voiceAssistant] ?? 0, currency)}</span></div>}
              {state.smartBlinds && <div className="flex justify-between text-indigo-700"><span>Smart blinds</span><span>+{formatPriceCurrency(SMART_BLINDS_PRICE, currency)}</span></div>}
              {state.cabinetStyle !== "modern" && <div className="flex justify-between"><span className="text-gray-600">Cabinet style ({state.cabinetStyle})</span><span className="text-gray-700">{formatPriceCurrency(CABINET_STYLE_PRICE[state.cabinetStyle], currency)}</span></div>}
              {state.cabinetColor !== "white" && <div className="flex justify-between"><span className="text-gray-600">Cabinet color ({state.cabinetColor})</span><span className="text-gray-700">{formatPriceCurrency(CABINET_COLOR_PRICE[state.cabinetColor], currency)}</span></div>}
              {state.sinkType !== "single" && <div className="flex justify-between"><span className="text-gray-600">Sink ({state.sinkType})</span><span className="text-gray-700">{formatPriceCurrency(SINK_TYPE_PRICE[state.sinkType], currency)}</span></div>}
              {state.backsplash !== "none" && <div className="flex justify-between"><span className="text-gray-600">Backsplash ({state.backsplash})</span><span className="text-gray-700">{formatPriceCurrency(BACKSPLASH_PRICE[state.backsplash], currency)}</span></div>}
              {state.hasIsland && <div className="flex justify-between text-amber-700"><span>Kitchen island</span><span>+{formatPriceCurrency(ISLAND_PRICE, currency)}</span></div>}
              {state.vanityStyle !== "freestanding" && <div className="flex justify-between"><span className="text-gray-600">Vanity ({state.vanityStyle})</span><span className="text-gray-700">{formatPriceCurrency(VANITY_STYLE_PRICE[state.vanityStyle], currency)}</span></div>}
              {state.mirrorType !== "standard" && <div className="flex justify-between"><span className="text-gray-600">Mirror ({state.mirrorType})</span><span className="text-gray-700">{formatPriceCurrency(MIRROR_TYPE_PRICE[state.mirrorType], currency)}</span></div>}
              {state.hasTowelRail && <div className="flex justify-between text-orange-700"><span>Heated towel rail</span><span>+{formatPriceCurrency(TOWEL_RAIL_PRICE, currency)}</span></div>}
              {state.showerType !== "enclosed" && <div className="flex justify-between"><span className="text-gray-600">Shower ({state.showerType})</span><span className="text-gray-700">{formatPriceCurrency(SHOWER_TYPE_PRICE[state.showerType], currency)}</span></div>}
              {state.windows.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.windows.length} window{state.windows.length > 1 ? "s" : ""}</span><span className="text-gray-700">{formatPriceCurrency((state.windows.length * 800), currency)}</span></div>
              )}
              {state.doors.length > 0 && (
                <div className="flex justify-between"><span className="text-gray-600">{state.doors.length} door{state.doors.length > 1 ? "s" : ""}</span><span className="text-gray-700">{formatPriceCurrency((state.doors.length * 600), currency)}</span></div>
              )}
              {state.solarPanels && <div className="flex justify-between text-amber-700"><span>Solar panel array ({(() => { let rm = 6.058*2.438; if (state.containerSize === "40ft") rm = 12.192*2.438; else if (state.containerSize === "double") rm = 12.192*4.876; else if (state.containerSize === "custom") rm = (state.customLength*0.3048)*(state.customWidth*0.3048); return Math.max(1, Math.floor((rm*0.85)/1.7)); })()} panels)</span><span>+{formatPriceCurrency((() => { let rm = 6.058*2.438; if (state.containerSize === "40ft") rm = 12.192*2.438; else if (state.containerSize === "double") rm = 12.192*4.876; else if (state.containerSize === "custom") rm = (state.customLength*0.3048)*(state.customWidth*0.3048); return Math.max(1, Math.floor((rm*0.85)/1.7)) * 3500; })(), currency)}</span></div>}
              {state.batterySize !== "none" && <div className="flex justify-between text-green-700"><span>Battery ({state.batterySize} kWh)</span><span>+{formatPriceCurrency((parseInt(state.batterySize) * 5000), currency)}</span></div>}
              {state.windTurbine && <div className="flex justify-between text-sky-700"><span>Wind turbine ({state.windTurbineSize} kW)</span><span>+{formatPriceCurrency((state.windTurbineSize === "1" ? 30000 : state.windTurbineSize === "3" ? 50000 : 80000), currency)}</span></div>}
              {state.heatPumpType !== "none" && <div className="flex justify-between text-orange-700"><span>Heat pump ({state.heatPumpType})</span><span>+{formatPriceCurrency((state.heatPumpType === "air-air" ? 50000 : state.heatPumpType === "air-water" ? 80000 : 150000), currency)}</span></div>}
              {state.deck && <div className="flex justify-between text-amber-700"><span>Deck / terrace</span><span>+{formatPriceCurrency(5000, currency)}</span></div>}
              {state.stairs && <div className="flex justify-between text-gray-700"><span>External stairs</span><span>+{formatPriceCurrency(5000, currency)}</span></div>}
              {state.balcony && <div className="flex justify-between text-gray-700"><span>Balcony</span><span>+{formatPriceCurrency(6000, currency)}</span></div>}
              {state.roofTerrace && <div className="flex justify-between text-gray-700"><span>Roof terrace</span><span>+{formatPriceCurrency(7500, currency)}</span></div>}
            </div>

            <hr className="border-gray-200" />

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-gray-900">{t("zongosol.estimatedTotal")}</span>
              <span className="text-2xl font-extrabold text-emerald-700">{formatPriceCurrency(total, currency)}</span>
            </div>
            <p className="text-xs text-gray-400">* {t("zongosol.allPricesExclVat")}. {t("zongosol.excludesExtras")}</p>

            <div className="space-y-2">
              <button onClick={handleSave}
                className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
                  saved ? "bg-green-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >{saved ? "✓ " + t("zongosol.saveDesign") : t("zongosol.saveDesign")}</button>
              {showSaveForm && (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-emerald-800">Send design to our team</p>
                  <input type="text" placeholder="Your name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                  <input type="email" placeholder="Your email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                  {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleSendDesign} disabled={sending} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{sending ? "Sending..." : "Send to patrick.kitolano@kitoslight.com"}</button>
                    <button onClick={() => setShowSaveForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}
              <button onClick={handleOrder}
                className="w-full py-3 rounded-lg text-sm font-semibold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-all"
              >
                {t("zongosol.orderNow50")}
              </button>

              {showDeposit && !depositPaid && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm font-bold text-amber-800">{t("zongosol.deposit50")}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">{t("zongosol.totalPrice")}</span><span className="font-bold text-gray-900">{formatPriceCurrency(total, currency)}</span></div>
                    <div className="flex justify-between"><span className="text-amber-700 font-semibold">{t("zongosol.deposit50")}</span><span className="font-bold text-amber-700">{formatPriceCurrency(deposit, currency)}</span></div>
                    <div className="flex justify-between border-t border-amber-200 pt-1.5"><span className="text-gray-500">{t("zongosol.remainingDelivery")}</span><span className="font-semibold text-gray-700">{formatPriceCurrency(remaining, currency)}</span></div>
                  </div>
                  <p className="text-xs text-amber-600">{t("zongosol.allPricesExclVat")}</p>
                  <a href={depositPaymentLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-amber-700 transition-all shadow-md">{t("zongosol.payDepositStripe", { deposit: formatPriceCurrency(deposit, currency) })}</a>
                  <button onClick={handleDepositPaid} className="block w-full rounded-lg border border-amber-300 px-4 py-2 text-center text-xs text-amber-600 hover:bg-amber-100 transition-all">{t("zongosol.simulateDepositPaid")}</button>
                </div>
              )}

              {showLogistics && depositPaid && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3 mt-3">
                  <div className="flex items-center gap-2"><svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg><span className="text-sm font-bold text-emerald-800">{t("zongosol.logisticsTitle")}</span></div>
                  <p className="text-xs text-emerald-700">{t("zongosol.depositConfirmed")}</p>
                  {!logisticsChoice ? (
                    <div className="space-y-2">
                      <button onClick={() => setLogisticsChoice("self")} className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-3 hover:border-emerald-400 transition-all"><p className="text-sm font-bold text-gray-900"> {t("zongosol.arrangeSelf")}</p><p className="text-xs text-gray-500 mt-0.5">{t("zongosol.noExtraCost")}</p></button>
                      <button onClick={() => setLogisticsChoice("kitozon")} className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-3 hover:border-emerald-400 transition-all"><p className="text-sm font-bold text-gray-900"> {t("zongosol.kitozonArranges")}</p><p className="text-xs text-gray-500 mt-0.5">{t("zongosol.priceAfterAgreement")}</p></button>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white border border-emerald-200 p-3">
                      <p className="text-sm font-semibold text-emerald-700">{logisticsChoice === "self" ? t("zongosol.youArrangeSelf") : t("zongosol.kitozonArrangesContact")}</p>
                      <p className="text-xs text-gray-500 mt-1">{logisticsChoice === "self" ? t("zongosol.noExtraCostProduction") : t("zongosol.consultantContact")}</p>
                      <button onClick={() => setLogisticsChoice(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">{t("zongosol.changeChoice")}</button>
                    </div>
                  )}
                  {logisticsChoice && <div className="rounded-lg bg-emerald-600 p-3 text-white text-center"><p className="text-sm font-bold">{t("zongosol.orderConfirmed")}</p><p className="text-xs text-emerald-100 mt-1">{t("zongosol.orderConfirmed")}</p></div>}
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
  const { t, currency } = useLanguage();
  const { annualKwh, co2Saved, panels } = estimateSolar(state);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t("zongosol.kitoslightConnected")}
        </span>
      </div>
      <div className="p-4 space-y-4">
        {!state.solarPanels ? (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500">{t("zongosol.addSolarPrompt")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("zongosol.toggleSolarHint")}</p>
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
                <p className="text-xs text-blue-600 mt-1">{t("zongosol.kwhPerYear")}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{co2Saved.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">{t("zongosol.co2SavedKg")}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{t("zongosol.equivalentTrees")}</span>
                <span className="font-semibold text-gray-800">~{Math.round(co2Saved / 21)} per year</span>
              </div>
              <div className="flex justify-between">
                <span>{t("zongosol.estimatedSavings")}</span>
                <span className="font-semibold text-gray-800">~{formatPriceCurrency(Math.round(annualKwh * 0.14), currency)}{t("/yr")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("zongosol.gridIndependence")}</span>
                <span className="font-semibold text-gray-800">{Math.min(100, Math.round((annualKwh / 11000) * 100))}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">{t("zongosol.kitoslightDataFeeds")}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Zongosol Page ─────────────────────────────────

function ZongosolPage() {
  const { t, currency } = useLanguage();
  const [state, dispatch] = useReducer(designReducer, null, initialDesignState);
  const [activeTab, setActiveTab] = useState<"design" | "exterior" | "energy" | "documentation">("design");
  const [viewMode, setViewMode] = useState<"3d" | "floorplan">("3d");
  const container3DRef = useRef<Container3DHandle>(null);
  const [fullscreenRoomId, setFullscreenRoomId] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState(false);

  // ── Undo/Redo history ──────────────────────────────
  const MAX_HISTORY = 50;
  const historyRef = useRef<DesignState[]>([]);
  const futureRef = useRef<DesignState[]>([]);

  // Track state changes for history
  const stateRef = useRef<DesignState>(state);
  const lastActionRef = useRef<DesignAction["type"] | null>(null);
  
  useEffect(() => {
    const prevState = stateRef.current;
    const actionType = lastActionRef.current;
    
    // Push previous state to history before state-changing actions
    if (actionType && actionType !== "LOAD_STATE" && actionType !== "RESET" && actionType !== "UNDO" && actionType !== "REDO") {
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prevState];
      futureRef.current = []; // Clear redo stack on new action
    }
    
    stateRef.current = state;
  }, [state]);

  // Wrap dispatch to track action types
  const trackedDispatch = useCallback((action: DesignAction) => {
    if (action.type === "UNDO") {
      const past = historyRef.current;
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      historyRef.current = past.slice(0, -1);
      futureRef.current = [...futureRef.current, stateRef.current].slice(-MAX_HISTORY);
      lastActionRef.current = "LOAD_STATE";
      dispatch({ type: "LOAD_STATE", state: prev });
      return;
    }
    if (action.type === "REDO") {
      const future = futureRef.current;
      if (future.length === 0) return;
      const next = future[future.length - 1];
      futureRef.current = future.slice(0, -1);
      historyRef.current = [...historyRef.current, stateRef.current].slice(-MAX_HISTORY);
      lastActionRef.current = "LOAD_STATE";
      dispatch({ type: "LOAD_STATE", state: next });
      return;
    }
    if (action.type === "RESET") {
      historyRef.current = [];
      futureRef.current = [];
    }
    lastActionRef.current = action.type;
    dispatch(action);
  }, [dispatch]);

  // ── Keyboard shortcuts for undo/redo ────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenRoomId) return; // Don't intercept when RoomFullscreen is open
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          trackedDispatch({ type: "REDO" });
        } else {
          trackedDispatch({ type: "UNDO" });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trackedDispatch, fullscreenRoomId]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const handleReset = useCallback(() => {
    trackedDispatch({ type: "RESET" });
    localStorage.removeItem(STORAGE_KEY);
  }, [trackedDispatch]);

  return (
    <ErrorBoundary>
      {fullscreenRoomId ? (
        <RoomFullscreen
          state={state}
          roomId={fullscreenRoomId}
          onClose={() => setFullscreenRoomId(null)}
          onStateChange={(updates) => {
            if (updates.kitchenLayout !== undefined) trackedDispatch({ type: "SET_KITCHEN_LAYOUT", layout: updates.kitchenLayout });
            if (updates.kitchenCountertop !== undefined) trackedDispatch({ type: "SET_KITCHEN_COUNTERTOP", material: updates.kitchenCountertop });
            if (updates.kitchenAppliances !== undefined) {
              // Replace entire array
              const current = state.kitchenAppliances;
              const next = updates.kitchenAppliances;
              const toRemove = current.filter(a => !next.includes(a));
              const toAdd = next.filter(a => !current.includes(a));
              toRemove.forEach(a => trackedDispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: a }));
              toAdd.forEach(a => trackedDispatch({ type: "TOGGLE_KITCHEN_APPLIANCE", appliance: a }));
            }
            if (updates.bathFixtures !== undefined) {
              const current = state.bathFixtures;
              const next = updates.bathFixtures;
              const toRemove = current.filter(f => !next.includes(f));
              const toAdd = next.filter(f => !current.includes(f));
              toRemove.forEach(f => trackedDispatch({ type: "TOGGLE_BATH_FIXTURE", fixture: f }));
              toAdd.forEach(f => trackedDispatch({ type: "TOGGLE_BATH_FIXTURE", fixture: f }));
            }
            if (updates.livingItems !== undefined) {
              const current = state.livingItems;
              const next = updates.livingItems;
              const toRemove = current.filter(i => !next.includes(i));
              const toAdd = next.filter(i => !current.includes(i));
              toRemove.forEach(i => trackedDispatch({ type: "TOGGLE_LIVING_ITEM", item: i }));
              toAdd.forEach(i => trackedDispatch({ type: "TOGGLE_LIVING_ITEM", item: i }));
            }
            if (updates.bedroomItems !== undefined) {
              const current = state.bedroomItems;
              const next = updates.bedroomItems;
              const toRemove = current.filter(i => !next.includes(i));
              const toAdd = next.filter(i => !current.includes(i));
              toRemove.forEach(i => trackedDispatch({ type: "TOGGLE_BEDROOM_ITEM", item: i }));
              toAdd.forEach(i => trackedDispatch({ type: "TOGGLE_BEDROOM_ITEM", item: i }));
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
                Zongosol <span className="text-emerald-200 font-normal">{t("zongosol.heroTitle")}</span>
              </h1>
              <p className="mt-1 text-emerald-100 text-sm">
                {t("zongosol.heroSubtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => trackedDispatch({ type: "UNDO" })}
                disabled={historyRef.current.length === 0}
                title="Undo (Ctrl+Z)"
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  historyRef.current.length === 0
                    ? "border-white/20 text-white/40 cursor-not-allowed"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >↩ {t("zongosol.undo")}</button>
              <button
                onClick={() => trackedDispatch({ type: "REDO" })}
                disabled={futureRef.current.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  futureRef.current.length === 0
                    ? "border-white/20 text-white/40 cursor-not-allowed"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >↪ {t("zongosol.redo")}</button>
              <button onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-all"
              >{t("zongosol.startOver")}</button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ModelSelector state={state} dispatch={trackedDispatch} />

        <LayoutSelector state={state} dispatch={trackedDispatch} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {viewMode === "3d" ? (
              <Suspense fallback={<div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl"><div className="text-gray-500">{t("zongosol.loading3D")}</div></div>}><Container3D ref={container3DRef} state={state} viewMode={viewMode} onViewModeChange={setViewMode} onRoomClick={(roomId) => setFullscreenRoomId(roomId)} tourActive={tourActive} onTourStateChange={setTourActive} /></Suspense>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <button onClick={() => setViewMode("3d")}
                      className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px]"
                    >{t("zongosol.view3D")}</button>
                    <button onClick={() => setViewMode("floorplan")}
                      className="px-3 py-2 text-xs font-medium bg-emerald-600 text-white transition-colors min-h-[44px]"
                    >{t("zongosol.viewFloorPlan")}</button>
                  </div>
                </div>
                <FloorPlan state={state} dispatch={trackedDispatch} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTab("design")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "design" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >{t("zongosol.interior")}</button>
              <button onClick={() => setActiveTab("exterior")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "exterior" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >{t("zongosol.exterior")}</button>
              <button onClick={() => setActiveTab("energy")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "energy" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >{t("zongosol.energy")}</button>
              <button onClick={() => setActiveTab("documentation")}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeTab === "documentation" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >{t("zongosol.docs")}</button>
            </div>

            {activeTab === "design" && <InteriorPanel state={state} dispatch={trackedDispatch} />}
            {activeTab === "exterior" && <ExteriorPanel state={state} dispatch={trackedDispatch} />}
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
                  if (u.solarPanels !== undefined) trackedDispatch({ type: "TOGGLE_SOLAR" });
                  if (u.panelType !== undefined) trackedDispatch({ type: "SET_PANEL_TYPE", panelType: u.panelType });
                  if (u.batterySize !== undefined) trackedDispatch({ type: "SET_BATTERY_SIZE", batterySize: u.batterySize });
                  if (u.inverterType !== undefined) trackedDispatch({ type: "SET_INVERTER_TYPE", inverterType: u.inverterType });
                  if (u.windTurbine !== undefined) trackedDispatch({ type: "TOGGLE_WIND_TURBINE" });
                  if (u.windTurbineSize !== undefined) trackedDispatch({ type: "SET_WIND_TURBINE_SIZE", windTurbineSize: u.windTurbineSize });
                  if (u.heatPumpType !== undefined) trackedDispatch({ type: "SET_HEAT_PUMP_TYPE", heatPumpType: u.heatPumpType });
                  if (u.evCharger !== undefined) trackedDispatch({ type: "TOGGLE_EV_CHARGER" });
                  if (u.evChargerPower !== undefined) trackedDispatch({ type: "SET_EV_CHARGER_POWER", evChargerPower: u.evChargerPower });
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
            <SummaryPanel state={state} dispatch={trackedDispatch} />
          </div>
        </div>

        {/* ── Cross-platform teasers ────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 space-y-4">

          {/* AFER CITY */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">{t("zongosol.afercityTeaserTitle")}</h3>
                <p className="text-amber-100 text-sm max-w-lg">{t("zongosol.afercityTeaserDesc")}</p>
              </div>
              <Link
                to="/afercity"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-all duration-200 shadow-lg flex-shrink-0"
              >
                {t("zongosol.afercityTeaserLink")}
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
                  <h3 className="text-lg font-bold">{t("zongosol.dashboardTitle")}</h3>
                </div>
                <p className="text-emerald-100 text-sm max-w-lg">
                  {t("zongosol.dashboardDesc")}
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-lg flex-shrink-0"
              >
                {t("zongosol.openDashboard")}
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
