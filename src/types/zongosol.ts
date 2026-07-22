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
export type FurnitureType = LivingItem | BedroomItem;
export type SmartHomeType = "none" | "knx" | "zigbee";

// ── Phase 4: Enhanced kitchen types ─────────────────────
export type CabinetStyle = "modern" | "classic" | "minimal";
export type CabinetColor = "white" | "oak" | "walnut" | "grey" | "navy";
export type SinkType = "single" | "double" | "undermount";
export type BacksplashType = "tile" | "glass" | "steel" | "none";

// ── Phase 4: Enhanced bathroom types ────────────────────
export type VanityStyle = "floating" | "freestanding" | "wall-mounted";
export type MirrorType = "standard" | "led" | "medicine";
export type ShowerType = "walk-in" | "enclosed" | "over-bath";

// ── Phase 4: Smart home types ───────────────────────────
export type VoiceAssistant = "none" | "alexa" | "google" | "homekit";

// ── Phase 4: Electrical planning types ──────────────────
export interface ElectricalOutlet {
  id: string;
  wall: Wall;
  position: number; // 0-100 along wall
}
export type LightFixtureType = "ceiling" | "track" | "pendant" | "sconce";
export interface PlacedLight {
  id: string;
  lightType: LightFixtureType;
  wall: Wall;
  position: number;
}
export interface SwitchPlacement {
  id: string;
  wall: Wall;
  position: number;
}

// ── Placed furniture (drag & drop on floor plan) ──────────
export interface PlacedFurniture {
  id: string;
  type: FurnitureType;
  x: number;   // position in 2D SVG coordinate space
  y: number;
  width: number;   // size in SVG units
  height: number;
  rotation: 0 | 90 | 180 | 270;
  color: string;
}

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
  // Phase 4: Enhanced kitchen
  cabinetStyle: CabinetStyle;
  cabinetColor: CabinetColor;
  sinkType: SinkType;
  backsplash: BacksplashType;
  hasIsland: boolean;
  // Phase 4: Enhanced bathroom
  vanityStyle: VanityStyle;
  mirrorType: MirrorType;
  hasTowelRail: boolean;
  showerType: ShowerType;
  // Phase 4: Electrical planning
  electrical: { outlets: ElectricalOutlet[]; lights: PlacedLight[]; switches: SwitchPlacement[]; panel: boolean };
  // Phase 4: Smart home
  smartThermostat: boolean;
  smartLighting: boolean;
  smartLocks: boolean;
  smartSecurity: boolean;
  voiceAssistant: VoiceAssistant;
  smartBlinds: boolean;
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
  placedFurniture: PlacedFurniture[];
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
  | { type: "SET_EV_CHARGER_POWER"; evChargerPower: EVChargerPower }
  // Furniture drag & drop
  | { type: "PLACE_FURNITURE"; furniture: PlacedFurniture }
  | { type: "MOVE_FURNITURE"; id: string; x: number; y: number }
  | { type: "REMOVE_FURNITURE"; id: string }
  | { type: "ROTATE_FURNITURE"; id: string }
  | { type: "CLEAR_ALL_FURNITURE" }
  // Phase 4: Enhanced kitchen
  | { type: "SET_CABINET_STYLE"; style: CabinetStyle }
  | { type: "SET_CABINET_COLOR"; color: CabinetColor }
  | { type: "SET_SINK_TYPE"; sinkType: SinkType }
  | { type: "SET_BACKSPLASH"; backsplash: BacksplashType }
  | { type: "TOGGLE_ISLAND" }
  // Phase 4: Enhanced bathroom
  | { type: "SET_VANITY_STYLE"; style: VanityStyle }
  | { type: "SET_MIRROR_TYPE"; mirrorType: MirrorType }
  | { type: "TOGGLE_TOWEL_RAIL" }
  | { type: "SET_SHOWER_TYPE"; showerType: ShowerType }
  // Phase 4: Electrical planning
  | { type: "ADD_ELECTRICAL_OUTLET"; wall: Wall }
  | { type: "REMOVE_ELECTRICAL_OUTLET"; id: string }
  | { type: "ADD_LIGHT"; lightType: LightFixtureType; wall: Wall }
  | { type: "REMOVE_LIGHT"; id: string }
  | { type: "ADD_SWITCH"; wall: Wall }
  | { type: "REMOVE_SWITCH"; id: string }
  | { type: "TOGGLE_ELECTRICAL_PANEL" }
  // Phase 4: Smart home
  | { type: "TOGGLE_SMART_THERMOSTAT" }
  | { type: "TOGGLE_SMART_LIGHTING" }
  | { type: "TOGGLE_SMART_LOCKS" }
  | { type: "TOGGLE_SMART_SECURITY" }
  | { type: "SET_VOICE_ASSISTANT"; assistant: VoiceAssistant }
  | { type: "TOGGLE_SMART_BLINDS" };
