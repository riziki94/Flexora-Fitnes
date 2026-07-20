import { useState } from "react";
import { formatPrice } from "../lib/currency";

// ── Types ──────────────────────────────────────────────

export type PanelType = "standard" | "premium" | "ultra";
export type BatterySize = "none" | "5" | "10" | "15" | "20";
export type InverterType = "string" | "micro" | "hybrid";
export type WindSize = "1" | "3" | "5";
export type HeatPumpType = "none" | "air-air" | "air-water" | "ground";
export type EVChargerPower = "7.4" | "11" | "22";

export interface EnergyState {
  solarPanels: boolean;
  panelType: PanelType;
  batterySize: BatterySize;
  inverterType: InverterType;
  windTurbine: boolean;
  windTurbineSize: WindSize;
  heatPumpType: HeatPumpType;
  evCharger: boolean;
  evChargerPower: EVChargerPower;
}

export const DEFAULT_ENERGY_STATE: EnergyState = {
  solarPanels: false,
  panelType: "standard",
  batterySize: "none",
  inverterType: "string",
  windTurbine: false,
  windTurbineSize: "1",
  heatPumpType: "none",
  evCharger: false,
  evChargerPower: "7.4",
};

// ── Constants ──────────────────────────────────────────

const PANEL_WATTAGE: Record<PanelType, number> = { standard: 400, premium: 500, ultra: 600 };
const PANEL_AREA_M2 = 1.7;
const SOLAR_IRRADIATION = 900; // kWh/kWp/year (Norway)
const WIND_HOURS = 2000; // coastal Norway
const GRID_EMISSION_NO = 19; // g CO₂/kWh
const GRID_EMISSION_EU = 230; // g CO₂/kWh
const ELECTRICITY_PRICE = 1.5; // NOK/kWh
const HOME_ENERGY_USE = 150; // kWh/m²/year
const EV_KM_PER_YEAR = 15000;
const EV_KWH_PER_KM = 0.2;
const TREE_CO2 = 21; // kg/tree/year

const PANEL_PRICE = 3500; // NOK per panel installed
const BATTERY_PRICE_PER_KWH = 5000; // NOK
const WIND_PRICE: Record<WindSize, number> = { "1": 30000, "3": 50000, "5": 80000 };
const HEAT_PUMP_PRICE: Record<HeatPumpType, number> = { "none": 0, "air-air": 50000, "air-water": 80000, "ground": 150000 };
const HEAT_PUMP_COP: Record<HeatPumpType, number> = { "none": 0, "air-air": 3, "air-water": 3.5, "ground": 4 };

// ── Calculation helpers ────────────────────────────────

function getRoofAreaM2(lengthFt: number, widthFt: number, size: string): number {
  if (size === "20ft") return 6.058 * 2.438;
  if (size === "40ft") return 12.192 * 2.438;
  if (size === "double") return 12.192 * 4.876;
  return (lengthFt * 0.3048) * (widthFt * 0.3048);
}

function getHouseAreaM2(lengthFt: number, widthFt: number, size: string): number {
  return getRoofAreaM2(lengthFt, widthFt, size);
}

interface EnergyCalc {
  // Solar
  roofAreaM2: number;
  panelCount: number;
  totalCapacityKWp: number;
  solarProductionKWh: number;
  solarPrice: number;

  // Battery
  batteryKWh: number;
  batteryPrice: number;
  dailyUsageKWh: number;
  backupHours: number;
  selfSufficiencyPct: number;

  // Wind
  windProductionKWh: number;
  windPrice: number;

  // Heat pump
  heatPumpSavingsKWh: number;
  heatPumpPrice: number;
  heatPumpCOP: number;

  // EV
  evAnnualKWh: number;

  // Totals
  totalProductionKWh: number;
  totalConsumptionKWh: number;
  netBalanceKWh: number;
  gridIndependencePct: number;
  annualSavingsNOK: number;
  co2SavedKg: number;
  treeEquivalents: number;
  energyTotalPrice: number;
}

export function calculateEnergy(
  state: EnergyState,
  containerSize: string,
  customLength: number,
  customWidth: number,
  smartHome: string,
): EnergyCalc {
  const roofAreaM2 = getRoofAreaM2(customLength, customWidth, containerSize);
  const houseAreaM2 = getHouseAreaM2(customLength, customWidth, containerSize);
  const usableRoof = roofAreaM2 * 0.85; // 85% usable

  // Solar
  const panelCount = state.solarPanels ? Math.max(1, Math.floor(usableRoof / PANEL_AREA_M2)) : 0;
  const panelWattage = PANEL_WATTAGE[state.panelType];
  const totalCapacityKWp = state.solarPanels ? (panelCount * panelWattage) / 1000 : 0;
  const solarProductionKWh = Math.round(totalCapacityKWp * SOLAR_IRRADIATION);
  const solarPrice = state.solarPanels ? panelCount * PANEL_PRICE : 0;

  // Battery
  const batteryKWh = state.batterySize === "none" ? 0 : parseInt(state.batterySize);
  const batteryPrice = batteryKWh * BATTERY_PRICE_PER_KWH;
  const dailyUsageKWh = (houseAreaM2 * HOME_ENERGY_USE) / 365;
  const backupHours = batteryKWh > 0 && dailyUsageKWh > 0 ? Math.round((batteryKWh / dailyUsageKWh) * 10) / 10 : 0;
  const selfSufficiencyPct = batteryKWh > 0 && totalCapacityKWp > 0
    ? Math.min(95, Math.round(40 + (batteryKWh / (totalCapacityKWp * 5)) * 55))
    : totalCapacityKWp > 0 ? 25 : 0;

  // Wind
  const windProductionKWh = state.windTurbine ? parseInt(state.windTurbineSize) * WIND_HOURS : 0;
  const windPrice = state.windTurbine ? WIND_PRICE[state.windTurbineSize] : 0;

  // Heat pump
  const heatPumpCOP = HEAT_PUMP_COP[state.heatPumpType];
  const heatPumpPrice = HEAT_PUMP_PRICE[state.heatPumpType];
  // Estimated heating energy need: ~60% of home energy for heating in Norway
  const heatingNeedKWh = houseAreaM2 * HOME_ENERGY_USE * 0.6;
  const heatPumpSavingsKWh = state.heatPumpType !== "none"
    ? Math.round(heatingNeedKWh - heatingNeedKWh / heatPumpCOP)
    : 0;

  // EV
  const evAnnualKWh = state.evCharger ? Math.round(EV_KM_PER_YEAR * EV_KWH_PER_KM) : 0;

  // Totals
  const totalProductionKWh = solarProductionKWh + windProductionKWh;
  const totalConsumptionKWh = Math.round(houseAreaM2 * HOME_ENERGY_USE) + evAnnualKWh;
  const netBalanceKWh = totalProductionKWh - totalConsumptionKWh;
  const gridIndependencePct = totalConsumptionKWh > 0
    ? Math.min(100, Math.round((totalProductionKWh / totalConsumptionKWh) * 100))
    : 0;
  const annualSavingsNOK = totalProductionKWh > 0
    ? Math.round(totalProductionKWh * ELECTRICITY_PRICE)
    : 0;
  // CO₂: avoided EU grid emissions minus Norwegian grid
  const co2SavedKg = Math.round(
    (totalProductionKWh * (GRID_EMISSION_EU - GRID_EMISSION_NO)) / 1000
  );
  const treeEquivalents = Math.round(co2SavedKg / TREE_CO2);

  // Energy pricing total
  const energyTotalPrice = solarPrice + batteryPrice + windPrice + heatPumpPrice;

  return {
    roofAreaM2,
    panelCount,
    totalCapacityKWp,
    solarProductionKWh,
    solarPrice,
    batteryKWh,
    batteryPrice,
    dailyUsageKWh,
    backupHours,
    selfSufficiencyPct,
    windProductionKWh,
    windPrice,
    heatPumpSavingsKWh,
    heatPumpPrice,
    heatPumpCOP,
    evAnnualKWh,
    totalProductionKWh,
    totalConsumptionKWh,
    netBalanceKWh,
    gridIndependencePct,
    annualSavingsNOK,
    co2SavedKg,
    treeEquivalents,
    energyTotalPrice,
  };
}

// ── ESG Score ───────────────────────────────────────────

interface ESGScore {
  total: number;
  grade: string;
  environmental: number;
  social: number;
  governance: number;
  kitoslight: number;
  label: string;
}

export function calculateESG(calc: EnergyCalc, state: EnergyState, smartHome: string): ESGScore {
  let environmental = 0;
  let social = 0;
  let governance = 0;
  let kitoslight = 0;

  // Environmental (max 40)
  // CO₂ savings: up to 15 points
  environmental += Math.min(15, Math.round((calc.co2SavedKg / 2000) * 15));
  // Solar capacity: up to 15 points
  environmental += Math.min(15, Math.round(calc.totalCapacityKWp * 1.5));
  // Energy efficiency: up to 10 points
  environmental += Math.min(10, Math.round(calc.gridIndependencePct / 10));

  // Social (max 20)
  // EV charger: 10 points
  if (state.evCharger) social += 10;
  // Sustainable: heat pump or solar
  if (state.solarPanels) social += 5;
  if (state.heatPumpType !== "none") social += 5;

  // Governance (max 20)
  // Smart home: up to 10
  if (smartHome === "knx") governance += 10;
  else if (smartHome === "zigbee") governance += 7;
  // Battery/monitoring: up to 10
  if (state.batterySize !== "none") governance += 10;

  // Kitoslight bonus (max 20)
  if (state.solarPanels) kitoslight += 10;
  if (state.evCharger) kitoslight += 5;
  if (smartHome !== "none") kitoslight += 5;

  const total = Math.min(100, environmental + social + governance + kitoslight);

  let grade: string;
  let label: string;
  if (total >= 90) { grade = "A+"; label = "Outstanding"; }
  else if (total >= 80) { grade = "A"; label = "Excellent"; }
  else if (total >= 70) { grade = "B"; label = "Very Good"; }
  else if (total >= 60) { grade = "C"; label = "Good"; }
  else if (total >= 50) { grade = "D"; label = "Fair"; }
  else if (total >= 30) { grade = "E"; label = "Basic"; }
  else { grade = "F"; label = "Needs Improvement"; }

  return { total, grade, environmental, social, governance, kitoslight, label };
}

// ── Sub-components ─────────────────────────────────────

function SolarPanelSection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> Solar Panel System
      </h4>

      {/* Toggle */}
      <button
        onClick={() => onUpdate({ solarPanels: !state.solarPanels })}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
          state.solarPanels ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800">Solar Panels</p>
          <p className="text-xs text-gray-500">Rooftop photovoltaic array</p>
        </div>
        <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.solarPanels ? "bg-emerald-500" : "bg-gray-300"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.solarPanels ? "translate-x-5" : "translate-x-1"}`} />
        </span>
      </button>

      {state.solarPanels && (
        <>
          {/* Roof info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Roof area</span>
              <span className="font-semibold">{calc.roofAreaM2.toFixed(1)} m² (85% usable: {(calc.roofAreaM2 * 0.85).toFixed(1)} m²)</span>
            </div>
          </div>

          {/* Panel type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Panel Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "standard" as PanelType, label: "Standard", watt: 400, desc: "400W" },
                { value: "premium" as PanelType, label: "Premium", watt: 500, desc: "500W" },
                { value: "ultra" as PanelType, label: "Ultra", watt: 600, desc: "600W" },
              ]).map((p) => (
                <button key={p.value} onClick={() => onUpdate({ panelType: p.value })}
                  className={`p-2 rounded-lg text-xs border transition-all ${
                    state.panelType === p.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-gray-400">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-amber-700">{calc.panelCount}</p>
                <p className="text-[10px] text-amber-600">Panels</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700">{calc.totalCapacityKWp.toFixed(1)}</p>
                <p className="text-[10px] text-amber-600">kWp</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700">{calc.solarProductionKWh.toLocaleString()}</p>
                <p className="text-[10px] text-amber-600">kWh/year</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 text-center font-medium">
              Your roof fits {calc.panelCount} × {PANEL_WATTAGE[state.panelType]}W panels = {calc.totalCapacityKWp.toFixed(1)} kWp → ~{calc.solarProductionKWh.toLocaleString()} kWh/year
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function BatterySection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> Battery Storage
      </h4>
      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-2">Battery Capacity</label>
        <div className="grid grid-cols-5 gap-1.5">
          {(["none", "5", "10", "15", "20"] as BatterySize[]).map((b) => (
            <button key={b} onClick={() => onUpdate({ batterySize: b })}
              className={`p-1.5 rounded-lg text-xs font-medium border transition-all ${
                state.batterySize === b ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >{b === "none" ? "None" : `${b} kWh`}</button>
          ))}
        </div>
      </div>
      {state.batterySize !== "none" && calc.batteryKWh > 0 && (
        <div className="bg-green-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Backup time</span>
            <span className="font-semibold text-green-700">{calc.backupHours} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Self-sufficiency</span>
            <span className="font-semibold text-green-700">{calc.selfSufficiencyPct}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Daily usage</span>
            <span className="font-semibold text-green-700">{calc.dailyUsageKWh.toFixed(1)} kWh</span>
          </div>
          <p className="text-green-700 font-medium">
            With {calc.batteryKWh} kWh battery: {calc.backupHours}h backup, {calc.selfSufficiencyPct}% self-sufficient
          </p>
        </div>
      )}
    </div>
  );
}

function InverterSection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> Inverter
        {state.solarPanels && <span className="text-xs font-normal text-gray-400">({calc.totalCapacityKWp.toFixed(1)} kW system)</span>}
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {([
          { value: "string" as InverterType, label: "String", desc: "Cost-effective" },
          { value: "micro" as InverterType, label: "Microinverters", desc: "Per-panel optimization" },
          { value: "hybrid" as InverterType, label: "Hybrid", desc: "Battery-ready" },
        ]).map((inv) => (
          <button key={inv.value} onClick={() => onUpdate({ inverterType: inv.value })}
            className={`p-2 rounded-lg text-xs border transition-all ${
              state.inverterType === inv.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold">{inv.label}</p>
            <p className="text-gray-400 text-[10px]">{inv.desc}</p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-400">Included in solar panel price</p>
    </div>
  );
}

function WindTurbineSection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> Wind Turbine <span className="text-xs font-normal text-gray-400">(optional)</span>
      </h4>

      <button
        onClick={() => onUpdate({ windTurbine: !state.windTurbine })}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
          state.windTurbine ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800">Small Wind Turbine</p>
          <p className="text-xs text-gray-500">Coastal Norway optimized</p>
        </div>
        <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.windTurbine ? "bg-emerald-500" : "bg-gray-300"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.windTurbine ? "translate-x-5" : "translate-x-1"}`} />
        </span>
      </button>

      {state.windTurbine && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "1" as WindSize, label: "1 kW", price: WIND_PRICE["1"] },
              { value: "3" as WindSize, label: "3 kW", price: WIND_PRICE["3"] },
              { value: "5" as WindSize, label: "5 kW", price: WIND_PRICE["5"] },
            ]).map((w) => (
              <button key={w.value} onClick={() => onUpdate({ windTurbineSize: w.value })}
                className={`p-2 rounded-lg text-xs border transition-all ${
                  state.windTurbineSize === w.value ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold">{w.label}</p>
                <p className="text-gray-400 text-[10px]">{formatPrice(w.price)}</p>
              </button>
            ))}
          </div>
          <div className="bg-sky-50 rounded-lg p-3 text-xs text-center">
            <p className="font-semibold text-sky-700">{calc.windProductionKWh.toLocaleString()} kWh/year</p>
            <p className="text-sky-600">{state.windTurbineSize} kW × {WIND_HOURS.toLocaleString()} hours (coastal Norway)</p>
          </div>
        </>
      )}
    </div>
  );
}

function HeatPumpSection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> Heat Pump
      </h4>
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { value: "none" as HeatPumpType, label: "None", cop: 0, price: 0 },
          { value: "air-air" as HeatPumpType, label: "Air-to-Air", cop: 3, price: 50000 },
          { value: "air-water" as HeatPumpType, label: "Air-to-Water", cop: 3.5, price: 80000 },
          { value: "ground" as HeatPumpType, label: "Ground", cop: 4, price: 150000 },
        ]).map((hp) => (
          <button key={hp.value} onClick={() => onUpdate({ heatPumpType: hp.value })}
            className={`p-2 rounded-lg text-xs border transition-all ${
              state.heatPumpType === hp.value ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold">{hp.label}</p>
            {hp.value !== "none" && (
              <>
                <p className="text-gray-400 text-[10px]">COP {hp.cop}</p>
                <p className="text-gray-400 text-[10px]">{formatPrice(hp.price)}</p>
              </>
            )}
          </button>
        ))}
      </div>
      {state.heatPumpType !== "none" && (
        <div className="bg-orange-50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">COP (efficiency)</span>
            <span className="font-semibold text-orange-700">{calc.heatPumpCOP}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Annual savings vs electric</span>
            <span className="font-semibold text-orange-700">{calc.heatPumpSavingsKWh.toLocaleString()} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Savings in NOK</span>
            <span className="font-semibold text-orange-700">~{formatPrice(Math.round(calc.heatPumpSavingsKWh * ELECTRICITY_PRICE))}/yr</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EVChargerSection({
  state, calc, onUpdate,
}: { state: EnergyState; calc: EnergyCalc; onUpdate: (u: Partial<EnergyState>) => void }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span></span> EV Charger
      </h4>

      <button
        onClick={() => onUpdate({ evCharger: !state.evCharger })}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
          state.evCharger ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800">Wall-Mounted EV Charger</p>
          <p className="text-xs text-gray-500">Type 2 · {formatPrice(8000)} installed</p>
        </div>
        <span className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${state.evCharger ? "bg-emerald-500" : "bg-gray-300"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.evCharger ? "translate-x-5" : "translate-x-1"}`} />
        </span>
      </button>

      {state.evCharger && (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Charger Power</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "7.4" as EVChargerPower, label: "7.4 kW", desc: "Single-phase" },
                { value: "11" as EVChargerPower, label: "11 kW", desc: "Three-phase" },
                { value: "22" as EVChargerPower, label: "22 kW", desc: "Fast charging" },
              ]).map((ev) => (
                <button key={ev.value} onClick={() => onUpdate({ evChargerPower: ev.value })}
                  className={`p-2 rounded-lg text-xs border transition-all ${
                    state.evChargerPower === ev.value ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold">{ev.label}</p>
                  <p className="text-gray-400 text-[10px]">{ev.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-xs text-center">
            <p className="font-semibold text-purple-700">{calc.evAnnualKWh.toLocaleString()} kWh/year</p>
            <p className="text-purple-600">{EV_KM_PER_YEAR.toLocaleString()} km × {EV_KWH_PER_KM} kWh/km</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Energy Flow Diagram ────────────────────────────────

function EnergyFlowDiagram({ calc, state }: { calc: EnergyCalc; state: EnergyState }) {
  const hasSolar = state.solarPanels && calc.solarProductionKWh > 0;
  const hasWind = state.windTurbine && calc.windProductionKWh > 0;
  const hasBattery = state.batterySize !== "none";
  const hasEV = state.evCharger;
  const totalProduction = calc.totalProductionKWh;

  if (totalProduction === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span></span> Energy Flow Diagram
          </span>
        </div>
        <div className="p-6 text-center text-sm text-gray-400">
          Add solar panels or a wind turbine to see the energy flow.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span></span> Energy Flow Diagram
        </span>
      </div>
      <div className="p-4">
        <div className="flex flex-col items-center gap-3">
          {/* Sources row */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {hasSolar && (
              <div className="flex items-center gap-2 bg-amber-50 rounded-full px-4 py-2 border border-amber-200">
                <span className="text-xl"></span>
                <span className="text-xs font-semibold text-amber-700">{calc.solarProductionKWh.toLocaleString()} kWh</span>
              </div>
            )}
            {hasWind && (
              <div className="flex items-center gap-2 bg-sky-50 rounded-full px-4 py-2 border border-sky-200">
                <span className="text-xl"></span>
                <span className="text-xs font-semibold text-sky-700">{calc.windProductionKWh.toLocaleString()} kWh</span>
              </div>
            )}
          </div>

          {/* Arrow down */}
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-lg animate-pulse">↓</span>
            <div className="bg-gray-100 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-gray-600">{totalProduction.toLocaleString()} kWh total</span>
            </div>
            <span className="text-gray-400 text-lg animate-pulse">↓</span>
          </div>

          {/* Inverter */}
          <div className="flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2 border border-blue-200">
            <span></span>
            <span className="text-xs font-semibold text-blue-700 capitalize">{state.inverterType} Inverter</span>
          </div>

          <span className="text-gray-400 text-lg animate-pulse">↓</span>

          {/* Destinations */}
          <div className="flex flex-wrap gap-3 justify-center">
            {/* House */}
            <div className="flex flex-col items-center gap-1 bg-green-50 rounded-xl p-3 border border-green-200 min-w-[80px]">
              <span className="text-2xl"></span>
              <span className="text-[10px] font-semibold text-green-700">House</span>
              <span className="text-[10px] text-green-600">{Math.round(totalProduction * 0.4).toLocaleString()} kWh</span>
            </div>

            {/* Battery */}
            {hasBattery && (
              <div className="flex flex-col items-center gap-1 bg-green-50 rounded-xl p-3 border border-green-200 min-w-[80px]">
                <span className="text-2xl"></span>
                <span className="text-[10px] font-semibold text-green-700">Battery</span>
                <span className="text-[10px] text-green-600">{Math.round(totalProduction * 0.25).toLocaleString()} kWh</span>
              </div>
            )}

            {/* EV */}
            {hasEV && (
              <div className="flex flex-col items-center gap-1 bg-purple-50 rounded-xl p-3 border border-purple-200 min-w-[80px]">
                <span className="text-2xl"></span>
                <span className="text-[10px] font-semibold text-purple-700">EV</span>
                <span className="text-[10px] text-purple-600">{Math.round(calc.evAnnualKWh).toLocaleString()} kWh</span>
              </div>
            )}

            {/* Grid */}
            <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl p-3 border border-gray-200 min-w-[80px]">
              <span className="text-2xl"></span>
              <span className="text-[10px] font-semibold text-gray-700">Grid</span>
              <span className="text-[10px] text-gray-600">
                {calc.netBalanceKWh > 0 ? `+${calc.netBalanceKWh.toLocaleString()}` : `${calc.netBalanceKWh.toLocaleString()}`} kWh
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[10px] text-gray-400 mt-1">
            <span> Flow: Sun/Wind → Inverter → Loads</span>
            <span>{calc.netBalanceKWh > 0 ? " Exporting surplus to grid" : " Drawing from grid"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Energy Summary Dashboard ───────────────────────────

function EnergySummaryDashboard({ calc, state }: { calc: EnergyCalc; state: EnergyState }) {
  const hasAny = state.solarPanels || state.windTurbine;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span></span> Energy Summary Dashboard
        </span>
      </div>
      <div className="p-4 space-y-4">
        {!hasAny ? (
          <p className="text-sm text-gray-400 text-center py-4">Add solar panels or wind turbine to see energy summary.</p>
        ) : (
          <>
            {/* Production vs Consumption */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600 mb-1">Total Production</p>
                <p className="text-xl font-bold text-amber-700">{calc.totalProductionKWh.toLocaleString()}</p>
                <p className="text-[10px] text-amber-500">kWh/year</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Total Consumption</p>
                <p className="text-xl font-bold text-gray-700">{calc.totalConsumptionKWh.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">kWh/year</p>
              </div>
            </div>

            {/* Net Balance Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold">Net Balance</span>
                <span className={calc.netBalanceKWh >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  {calc.netBalanceKWh >= 0 ? "+" : ""}{calc.netBalanceKWh.toLocaleString()} kWh
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${calc.netBalanceKWh >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.abs(calc.netBalanceKWh) / calc.totalConsumptionKWh * 100)}%` }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-xs text-blue-600">Grid Independence</p>
                <p className="text-lg font-bold text-blue-700">{calc.gridIndependencePct}%</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-xs text-green-600">Annual Savings</p>
                <p className="text-lg font-bold text-green-700">{formatPrice(calc.annualSavingsNOK)}</p>
              </div>
            </div>

            {/* CO2 */}
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-green-600 font-semibold">CO₂ Saved</p>
                  <p className="text-lg font-bold text-green-700">{calc.co2SavedKg.toLocaleString()} kg/year</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">vs EU Grid (230g/kWh)</p>
                  <p className="text-sm font-semibold text-green-700"> {calc.treeEquivalents} trees</p>
                </div>
              </div>
              <p className="text-[10px] text-green-500 mt-1">Equivalent to planting {calc.treeEquivalents} trees per year ({TREE_CO2} kg CO₂/tree)</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ESG Score Gauge ────────────────────────────────────

function ESGScoreGauge({ esg }: { esg: ESGScore }) {
  const hasAny = esg.total > 0;
  const angle = hasAny ? (esg.total / 100) * 180 : 0;
  const radians = (angle - 90) * (Math.PI / 180);
  const r = 54;
  const cx = 64;
  const cy = 64;
  const x = cx + r * Math.cos(radians);
  const y = cy + r * Math.sin(radians);

  const gradeColor =
    esg.total >= 80 ? "#10b981" :
    esg.total >= 60 ? "#22c55e" :
    esg.total >= 40 ? "#eab308" :
    esg.total >= 20 ? "#f97316" : "#ef4444";

  const arcPath = (pct: number) => {
    const startAngle = -180;
    const endAngle = startAngle + (pct / 100) * 180;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const r2 = 50;
    const cx2 = 64;
    const cy2 = 64;
    const x1 = cx2 + r2 * Math.cos(startRad);
    const y1 = cy2 + r2 * Math.sin(startRad);
    const x2 = cx2 + r2 * Math.cos(endRad);
    const y2 = cy2 + r2 * Math.sin(endRad);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span></span> ESG Score
        </span>
      </div>
      <div className="p-4">
        {/* Gauge */}
        <div className="flex justify-center mb-3">
          <svg viewBox="0 0 128 80" className="w-48 h-32">
            {/* Background arc */}
            <path d={arcPath(100)} fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
            {/* Filled arc */}
            {hasAny && (
              <path d={arcPath(esg.total)} fill="none" stroke={gradeColor} strokeWidth="12" strokeLinecap="round"
                className="transition-all duration-1000"
              />
            )}
            {/* Needle */}
            {hasAny && (
              <>
                <circle cx={cx} cy={cy} r="3" fill="#374151" />
                <line x1={cx} y1={cy} x2={x} y2={y} stroke="#374151" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
            {/* Labels */}
            <text x="14" y="76" className="text-[8px]" fill="#9ca3af" textAnchor="middle">0</text>
            <text x="42" y="76" className="text-[8px]" fill="#9ca3af" textAnchor="middle">E</text>
            <text x="64" y="76" className="text-[8px]" fill="#9ca3af" textAnchor="middle">D</text>
            <text x="86" y="76" className="text-[8px]" fill="#9ca3af" textAnchor="middle">C</text>
            <text x="114" y="76" className="text-[8px]" fill="#9ca3af" textAnchor="middle">A</text>
          </svg>
        </div>

        {/* Score display */}
        <div className="text-center mb-3">
          <p className="text-3xl font-extrabold" style={{ color: gradeColor }}>{esg.total}</p>
          <p className="text-sm font-semibold text-gray-700">
            Grade <span style={{ color: gradeColor }}>{esg.grade}</span> — {esg.label}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600">Environmental (E)</span>
              <span className="font-semibold text-gray-700">{esg.environmental}/40</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(esg.environmental / 40) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600">Social (S)</span>
              <span className="font-semibold text-gray-700">{esg.social}/20</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(esg.social / 20) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600">Governance (G)</span>
              <span className="font-semibold text-gray-700">{esg.governance}/20</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(esg.governance / 20) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600">Kitoslight Bonus</span>
              <span className="font-semibold text-gray-700">{esg.kitoslight}/20</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(esg.kitoslight / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {esg.total >= 70 && (
          <div className="mt-3 bg-emerald-50 rounded-lg px-3 py-2 text-center">
            <span className="text-xs font-semibold text-emerald-700"> ESG-ready for reporting</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Energy Panel ──────────────────────────────────

export default function EnergyPanel({
  energyState,
  onEnergyUpdate,
  containerSize,
  customLength,
  customWidth,
  smartHome,
}: {
  energyState: EnergyState;
  onEnergyUpdate: (u: Partial<EnergyState>) => void;
  containerSize: string;
  customLength: number;
  customWidth: number;
  smartHome: string;
}) {
  const [subTab, setSubTab] = useState<"config" | "summary" | "esg">("config");

  const calc = calculateEnergy(energyState, containerSize, customLength, customWidth, smartHome);
  const esg = calculateESG(calc, energyState, smartHome);

  const subtabs: { key: typeof subTab; label: string; icon: string }[] = [
    { key: "config", label: "Configure", icon: "" },
    { key: "summary", label: "Summary", icon: "" },
    { key: "esg", label: "ESG Score", icon: "" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span></span> Energy System Design
          {calc.energyTotalPrice > 0 && (
            <span className="ml-auto text-xs font-normal text-gray-500">
              +{formatPrice(calc.energyTotalPrice)}
            </span>
          )}
        </span>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {subtabs.map((t) => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === t.key ? "text-amber-700 border-b-2 border-amber-600 bg-amber-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          ><span>{t.icon}</span> {t.label}</button>
        ))}
      </div>

      <div className="p-4 space-y-5 max-h-[600px] overflow-y-auto">
        {subTab === "config" && (
          <>
            <SolarPanelSection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
            <hr className="border-gray-100" />
            <BatterySection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
            <hr className="border-gray-100" />
            <InverterSection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
            <hr className="border-gray-100" />
            <WindTurbineSection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
            <hr className="border-gray-100" />
            <HeatPumpSection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
            <hr className="border-gray-100" />
            <EVChargerSection state={energyState} calc={calc} onUpdate={onEnergyUpdate} />
          </>
        )}

        {subTab === "summary" && (
          <>
            <EnergySummaryDashboard calc={calc} state={energyState} />
            <EnergyFlowDiagram calc={calc} state={energyState} />
          </>
        )}

        {subTab === "esg" && (
          <ESGScoreGauge esg={esg} />
        )}
      </div>
    </div>
  );
}
