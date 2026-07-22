// ── Zongosol Shared Types ─────────────────────────────────
// Single source of truth for all types shared between:
//   Container3D.tsx, zongosol/index.tsx, RoomFullscreen.tsx
// Import from here instead of defining inline.

import type {
  PanelType,
  BatterySize,
  InverterType,
  WindSize,
  HeatPumpType,
  EVChargerPower,
} from "../components/EnergyPanel";

// ── Core enums / unions ──────────────────────────────────

export type ContainerSize = "20ft" | "40ft" | "double" | "custom";
export type ExteriorColor = "wood" | "metal" | "white" | "green" | "charcoal";
export type RoomType = "kitchen" | "bathroom" | "living" | "bedroom";
export type Wall = "top" | "bottom" | "left" | "right";
export type LayoutType = "single" | "side-by-side" | "l-shape" | "u-shape" | "stacked";
export type KitchenLayout = "L-shape" | "galley" | "island";
// KitchenBrand removed — brands are no longer selectable
export type CountertopMaterial = "wood" | "granite" | "marble" | "laminate" | "steel";
export type KitchenAppliance = "refrigerator" | "oven" | "dishwasher" | "microwave" | "cooktop";
export type BathFixture = "shower" | "tub" | "double-sink" | "toilet" | "bidet";
export type LivingItem = "sofa-3" | "sofa-2" | "sectional" | "coffee-table" | "tv-unit" | "dining-4" | "dining-6" | "bookshelf";
export type BedroomItem = "bed-double" | "bed-queen" | "bed-single" | "wardrobe" | "nightstand" | "desk";
export type SmartHomeType = "none" | "knx" | "zigbee";

// ── View / environment types ─────────────────────────────

export type ViewPreset = "front" | "back" | "top" | "bird" | "walk" | "drone";
export type TimeOfDay = "sunrise" | "day" | "sunset" | "night";
export type Weather = "clear" | "rain" | "snow";
export type EnvironmentPreset = "morning-tour" | "golden-hour" | "cozy-evening" | "winter-wonderland" | "stormy-day";

// ── Interfaces ───────────────────────────────────────────

export interface Window_ {
  id: string;
  wall: Wall;
  position: number;
}

export interface Door_ {
  id: string;
  wall: Wall;
  position: number;
}

export interface RoomDef {
  id: string;
  type: RoomType;
  label: string;
}

export interface DesignState {
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

export interface TimeConfig {
  skyColor: string;
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  groundColor: string;
}

export interface WeatherConfig {
  skyTint: string;
  ambientMult: number;
  sunMult: number;
  particleType: "none" | "rain" | "snow";
  groundColor: string;
}

export interface ContainerPos {
  ox: number;
  oy: number;
  oz: number;
  rotY: number;
}

export interface RoomLayout3D {
  x: number;
  z: number;
  rw: number;
  rd: number;
  room: RoomDef;
}

// ── Reducer Action (used by zongosol/index.tsx) ──────────

export type DesignAction =
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
  | { type: "UNDO" }
  | { type: "REDO" }
  // Energy Phase 5
  | { type: "SET_PANEL_TYPE"; panelType: PanelType }
  | { type: "SET_BATTERY_SIZE"; batterySize: BatterySize }
  | { type: "SET_INVERTER_TYPE"; inverterType: InverterType }
  | { type: "TOGGLE_WIND_TURBINE" }
  | { type: "SET_WIND_TURBINE_SIZE"; windTurbineSize: WindSize }
  | { type: "SET_HEAT_PUMP_TYPE"; heatPumpType: HeatPumpType }
  | { type: "SET_EV_CHARGER_POWER"; evChargerPower: EVChargerPower };
