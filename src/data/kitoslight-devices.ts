export type DeviceType = "smart-bench" | "bus-shelter" | "sensor-pole";

export interface GasMetrics {
  so2ppm: number;   // Sulfur dioxide — volcanic gas, dangerous above 2 ppm
  h2sppm: number;   // Hydrogen sulfide — volcanic/toxic gas
  coppm: number;    // Carbon monoxide — from volcanic activity
  no2ppm: number;   // Nitrogen dioxide (converted from ppb)
  pm25: number;     // Particulate matter µg/m³
}

export interface ChargingData {
  phonesCharging: number;
  avgChargeTimeMin: number;
  powerOutputW: number;
  availablePorts: number;
  totalPorts: number;
}

export interface WifiData {
  usersConnected: number;
  avgSessionMin: number;
}

export interface ConnectedUser {
  id: string;
  chargeMin: number;
  wifiMin: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  city: string;
  country: string;
  lat: number;
  lng: number;
  ipAddress: string;
  status: "online" | "offline";
  metrics: {
    solarEnergyKW: number;
    chargingSessions: number;
    co2ppm: number;
    no2ppb: number;
    temperatureC: number;
  };
  // New enhanced fields
  gas: GasMetrics;
  charging: ChargingData;
  wifi: WifiData;
  connectedUsers: ConnectedUser[];
}

function generateUsers(count: number, wifiMul: number): ConnectedUser[] {
  const users: ConnectedUser[] = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `USR-${1000 + Math.floor(Math.random() * 9000)}`,
      chargeMin: Math.floor(Math.random() * 30) + 3,
      wifiMin: Math.floor(Math.random() * wifiMul * 20) + 2,
    });
  }
  return users;
}

export const devices: Device[] = [
  // ══════════════════════════════════════════════════════════════════
  // Smart Benches (4)
  // ══════════════════════════════════════════════════════════════════
  {
    id: "SB-OSL-001",
    name: "Frogner Park Smart Bench",
    type: "smart-bench",
    city: "Oslo",
    country: "Norway",
    lat: 59.9227,
    lng: 10.7043,
    ipAddress: "10.42.1.101",
    status: "online",
    metrics: { solarEnergyKW: 0.42, chargingSessions: 18, co2ppm: 418, no2ppb: 32, temperatureC: 14.2 },
    gas: { so2ppm: 0.02, h2sppm: 0.001, coppm: 0.3, no2ppm: 0.032, pm25: 8.5 },
    charging: { phonesCharging: 3, avgChargeTimeMin: 18, powerOutputW: 15, availablePorts: 1, totalPorts: 4 },
    wifi: { usersConnected: 5, avgSessionMin: 22 },
    connectedUsers: generateUsers(5, 2),
  },
  {
    id: "SB-BGO-001",
    name: "Bryggen Smart Bench",
    type: "smart-bench",
    city: "Bergen",
    country: "Norway",
    lat: 60.3975,
    lng: 5.3234,
    ipAddress: "10.42.2.101",
    status: "online",
    metrics: { solarEnergyKW: 0.31, chargingSessions: 12, co2ppm: 405, no2ppb: 22, temperatureC: 12.8 },
    gas: { so2ppm: 0.01, h2sppm: 0.001, coppm: 0.2, no2ppm: 0.022, pm25: 6.2 },
    charging: { phonesCharging: 2, avgChargeTimeMin: 22, powerOutputW: 15, availablePorts: 2, totalPorts: 4 },
    wifi: { usersConnected: 3, avgSessionMin: 18 },
    connectedUsers: generateUsers(3, 2),
  },
  {
    id: "SB-TRD-001",
    name: "Nidaros Smart Bench",
    type: "smart-bench",
    city: "Trondheim",
    country: "Norway",
    lat: 63.4269,
    lng: 10.3973,
    ipAddress: "10.42.3.101",
    status: "online",
    metrics: { solarEnergyKW: 0.28, chargingSessions: 9, co2ppm: 402, no2ppb: 18, temperatureC: 10.5 },
    gas: { so2ppm: 0.01, h2sppm: 0.0, coppm: 0.1, no2ppm: 0.018, pm25: 4.8 },
    charging: { phonesCharging: 1, avgChargeTimeMin: 25, powerOutputW: 15, availablePorts: 3, totalPorts: 4 },
    wifi: { usersConnected: 2, avgSessionMin: 15 },
    connectedUsers: generateUsers(2, 1),
  },
  {
    id: "SB-SVG-001",
    name: "Øvre Holmegate Bench",
    type: "smart-bench",
    city: "Stavanger",
    country: "Norway",
    lat: 58.9725,
    lng: 5.733,
    ipAddress: "10.42.4.101",
    status: "offline",
    metrics: { solarEnergyKW: 0, chargingSessions: 0, co2ppm: 0, no2ppb: 0, temperatureC: 0 },
    gas: { so2ppm: 0, h2sppm: 0, coppm: 0, no2ppm: 0, pm25: 0 },
    charging: { phonesCharging: 0, avgChargeTimeMin: 0, powerOutputW: 0, availablePorts: 4, totalPorts: 4 },
    wifi: { usersConnected: 0, avgSessionMin: 0 },
    connectedUsers: [],
  },

  // ══════════════════════════════════════════════════════════════════
  // Bus Shelters (4)
  // ══════════════════════════════════════════════════════════════════
  {
    id: "BS-OSL-001",
    name: "Jernbanetorget Bus Shelter",
    type: "bus-shelter",
    city: "Oslo",
    country: "Norway",
    lat: 59.912,
    lng: 10.7505,
    ipAddress: "10.42.1.201",
    status: "online",
    metrics: { solarEnergyKW: 1.85, chargingSessions: 34, co2ppm: 425, no2ppb: 45, temperatureC: 15.1 },
    gas: { so2ppm: 0.03, h2sppm: 0.002, coppm: 0.5, no2ppm: 0.045, pm25: 12.3 },
    charging: { phonesCharging: 5, avgChargeTimeMin: 16, powerOutputW: 18, availablePorts: 1, totalPorts: 6 },
    wifi: { usersConnected: 8, avgSessionMin: 28 },
    connectedUsers: generateUsers(8, 2),
  },
  {
    id: "BS-BGO-001",
    name: "Bystasjonen Bus Shelter",
    type: "bus-shelter",
    city: "Bergen",
    country: "Norway",
    lat: 60.3897,
    lng: 5.332,
    ipAddress: "10.42.2.201",
    status: "online",
    metrics: { solarEnergyKW: 1.42, chargingSessions: 27, co2ppm: 410, no2ppb: 28, temperatureC: 13.0 },
    gas: { so2ppm: 0.02, h2sppm: 0.001, coppm: 0.3, no2ppm: 0.028, pm25: 7.8 },
    charging: { phonesCharging: 4, avgChargeTimeMin: 20, powerOutputW: 18, availablePorts: 2, totalPorts: 6 },
    wifi: { usersConnected: 6, avgSessionMin: 24 },
    connectedUsers: generateUsers(6, 2),
  },
  {
    id: "BS-TRD-001",
    name: "Solsiden Bus Shelter",
    type: "bus-shelter",
    city: "Trondheim",
    country: "Norway",
    lat: 63.4346,
    lng: 10.4115,
    ipAddress: "10.42.3.201",
    status: "online",
    metrics: { solarEnergyKW: 1.15, chargingSessions: 21, co2ppm: 408, no2ppb: 20, temperatureC: 11.2 },
    gas: { so2ppm: 0.01, h2sppm: 0.0, coppm: 0.2, no2ppm: 0.020, pm25: 5.5 },
    charging: { phonesCharging: 3, avgChargeTimeMin: 19, powerOutputW: 18, availablePorts: 3, totalPorts: 6 },
    wifi: { usersConnected: 4, avgSessionMin: 20 },
    connectedUsers: generateUsers(4, 2),
  },
  {
    id: "BS-TMS-001",
    name: "Storgata Bus Shelter",
    type: "bus-shelter",
    city: "Tromsø",
    country: "Norway",
    lat: 69.649,
    lng: 18.955,
    ipAddress: "10.42.5.201",
    status: "online",
    metrics: { solarEnergyKW: 0.95, chargingSessions: 15, co2ppm: 398, no2ppb: 12, temperatureC: 6.8 },
    gas: { so2ppm: 0.01, h2sppm: 0.0, coppm: 0.1, no2ppm: 0.012, pm25: 3.2 },
    charging: { phonesCharging: 2, avgChargeTimeMin: 23, powerOutputW: 18, availablePorts: 4, totalPorts: 6 },
    wifi: { usersConnected: 3, avgSessionMin: 17 },
    connectedUsers: generateUsers(3, 2),
  },

  // ══════════════════════════════════════════════════════════════════
  // Sensor Poles (3)
  // ══════════════════════════════════════════════════════════════════
  {
    id: "SP-OSL-001",
    name: "Grønland Sensor Pole",
    type: "sensor-pole",
    city: "Oslo",
    country: "Norway",
    lat: 59.9127,
    lng: 10.76,
    ipAddress: "10.42.1.301",
    status: "online",
    metrics: { solarEnergyKW: 0.12, chargingSessions: 0, co2ppm: 432, no2ppb: 52, temperatureC: 15.6 },
    gas: { so2ppm: 0.04, h2sppm: 0.003, coppm: 0.6, no2ppm: 0.052, pm25: 15.1 },
    charging: { phonesCharging: 0, avgChargeTimeMin: 0, powerOutputW: 0, availablePorts: 0, totalPorts: 0 },
    wifi: { usersConnected: 0, avgSessionMin: 0 },
    connectedUsers: [],
  },
  {
    id: "SP-BGO-001",
    name: "Nygårdshøyden Sensor Pole",
    type: "sensor-pole",
    city: "Bergen",
    country: "Norway",
    lat: 60.386,
    lng: 5.325,
    ipAddress: "10.42.2.301",
    status: "online",
    metrics: { solarEnergyKW: 0.09, chargingSessions: 0, co2ppm: 412, no2ppb: 25, temperatureC: 13.2 },
    gas: { so2ppm: 0.02, h2sppm: 0.001, coppm: 0.3, no2ppm: 0.025, pm25: 9.0 },
    charging: { phonesCharging: 0, avgChargeTimeMin: 0, powerOutputW: 0, availablePorts: 0, totalPorts: 0 },
    wifi: { usersConnected: 0, avgSessionMin: 0 },
    connectedUsers: [],
  },
  {
    id: "SP-TMS-001",
    name: "UiT Campus Sensor Pole",
    type: "sensor-pole",
    city: "Tromsø",
    country: "Norway",
    lat: 69.68,
    lng: 18.971,
    ipAddress: "10.42.5.301",
    status: "online",
    metrics: { solarEnergyKW: 0.07, chargingSessions: 0, co2ppm: 395, no2ppb: 8, temperatureC: 5.2 },
    gas: { so2ppm: 0.01, h2sppm: 0.0, coppm: 0.1, no2ppm: 0.008, pm25: 2.1 },
    charging: { phonesCharging: 0, avgChargeTimeMin: 0, powerOutputW: 0, availablePorts: 0, totalPorts: 0 },
    wifi: { usersConnected: 0, avgSessionMin: 0 },
    connectedUsers: [],
  },

  // ══════════════════════════════════════════════════════════════════
  // DRC Congo — Goma, near Nyiragongo volcano (3 devices)
  // ══════════════════════════════════════════════════════════════════
  {
    id: "SP-GOM-001",
    name: "Goma City Center Sensor Pole",
    type: "sensor-pole",
    city: "Goma",
    country: "DRC Congo",
    lat: -1.6792,
    lng: 29.2236,
    ipAddress: "10.43.1.301",
    status: "online",
    metrics: { solarEnergyKW: 0.15, chargingSessions: 0, co2ppm: 620, no2ppb: 18, temperatureC: 27.8 },
    gas: {
      so2ppm: 3.5,   // DANGEROUS — above 2 ppm WHO limit
      h2sppm: 0.8,   // ELEVATED — volcanic activity
      coppm: 9.0,    // DANGEROUS — volcanic gas
      no2ppm: 0.018,
      pm25: 45.2,
    },
    charging: { phonesCharging: 0, avgChargeTimeMin: 0, powerOutputW: 0, availablePorts: 0, totalPorts: 0 },
    wifi: { usersConnected: 0, avgSessionMin: 0 },
    connectedUsers: [],
  },
  {
    id: "SB-GOM-001",
    name: "Nyiragongo View Smart Bench",
    type: "smart-bench",
    city: "Goma",
    country: "DRC Congo",
    lat: -1.6530,
    lng: 29.2400,
    ipAddress: "10.43.1.101",
    status: "online",
    metrics: { solarEnergyKW: 0.52, chargingSessions: 28, co2ppm: 580, no2ppb: 15, temperatureC: 28.5 },
    gas: {
      so2ppm: 2.8,   // DANGEROUS
      h2sppm: 0.65,  // ELEVATED
      coppm: 7.5,    // DANGEROUS
      no2ppm: 0.015,
      pm25: 38.7,
    },
    charging: { phonesCharging: 4, avgChargeTimeMin: 14, powerOutputW: 15, availablePorts: 0, totalPorts: 4 },
    wifi: { usersConnected: 6, avgSessionMin: 35 },
    connectedUsers: generateUsers(6, 3),
  },
  {
    id: "BS-GOM-001",
    name: "Goma Central Bus Shelter",
    type: "bus-shelter",
    city: "Goma",
    country: "DRC Congo",
    lat: -1.6725,
    lng: 29.2150,
    ipAddress: "10.43.1.201",
    status: "online",
    metrics: { solarEnergyKW: 2.15, chargingSessions: 42, co2ppm: 605, no2ppb: 22, temperatureC: 29.1 },
    gas: {
      so2ppm: 3.8,   // DANGEROUS — close to volcano
      h2sppm: 0.92,  // DANGEROUS
      coppm: 10.2,   // DANGEROUS
      no2ppm: 0.022,
      pm25: 52.0,
    },
    charging: { phonesCharging: 6, avgChargeTimeMin: 13, powerOutputW: 18, availablePorts: 0, totalPorts: 6 },
    wifi: { usersConnected: 10, avgSessionMin: 40 },
    connectedUsers: generateUsers(10, 3),
  },
];

export const cities = ["Oslo", "Bergen", "Trondheim", "Stavanger", "Tromsø", "Goma"];

// City coordinates for fly-to
export const cityCoords: Record<string, [number, number]> = {
  "Oslo": [59.9139, 10.7522],
  "Bergen": [60.3913, 5.3221],
  "Trondheim": [63.4305, 10.3951],
  "Stavanger": [58.9700, 5.7331],
  "Tromsø": [69.6496, 18.9560],
  "Goma": [-1.6741, 29.2283],
};

export const deviceTypeMeta: Record<
  DeviceType,
  { label: string; icon: string; color: string; description: string; features: string[] }
> = {
  "smart-bench": {
    label: "Smart Benches",
    icon: "",
    color: "emerald",
    description:
      "Solar-powered public benches with integrated environmental sensors, USB charging ports, and WiFi hotspots.",
    features: ["USB-C charging", "Wireless Qi charging", "WiFi hotspot", "CO₂ monitoring", "200W solar panel", "Ambient lighting"],
  },
  "bus-shelter": {
    label: "Bus Shelters",
    icon: "",
    color: "blue",
    description:
      "Solar-roofed bus shelters generating clean energy while monitoring local environmental conditions and providing EV charging.",
    features: ["USB-C charging", "Wireless Qi charging", "WiFi hotspot", "CO₂ monitoring", "1.5kW solar roof", "LED lighting", "Digital display"],
  },
  "sensor-pole": {
    label: "Sensor Poles",
    icon: "",
    color: "amber",
    description:
      "Standalone environmental sensor poles collecting hyperlocal air quality data: CO₂, NO₂, PM2.5, temperature, and humidity.",
    features: ["USB-C charging", "Wireless Qi charging", "WiFi hotspot", "CO₂ monitoring", "NO₂ sensor", "PM2.5 monitor", "Temperature & humidity"],
  },
};

// ── Gas safety thresholds (WHO & health guidelines) ──────────────────
export interface GasThreshold {
  gas: string;
  unit: string;
  safeMax: number;
  warningMax: number; // above this = dangerous
  label: string;
  description: string;
}

export const gasThresholds: Record<string, GasThreshold> = {
  so2ppm: {
    gas: "SO₂",
    unit: "ppm",
    safeMax: 0.5,
    warningMax: 2.0,
    label: "Sulfur Dioxide",
    description: "Volcanic gas — WHO 10-min guideline: 0.5 ppm",
  },
  h2sppm: {
    gas: "H₂S",
    unit: "ppm",
    safeMax: 0.1,
    warningMax: 0.5,
    label: "Hydrogen Sulfide",
    description: "Toxic volcanic gas — Odor threshold: 0.01 ppm",
  },
  coppm: {
    gas: "CO",
    unit: "ppm",
    safeMax: 9,
    warningMax: 25,
    label: "Carbon Monoxide",
    description: "From volcanic/incomplete combustion — WHO 8h: 9 ppm",
  },
  no2ppm: {
    gas: "NO₂",
    unit: "ppm",
    safeMax: 0.1,
    warningMax: 0.2,
    label: "Nitrogen Dioxide",
    description: "Traffic & combustion — WHO annual: 0.02 ppm",
  },
  pm25: {
    gas: "PM2.5",
    unit: "µg/m³",
    safeMax: 15,
    warningMax: 35,
    label: "Particulate Matter",
    description: "Fine particles — WHO 24h: 15 µg/m³",
  },
  co2ppm: {
    gas: "CO₂",
    unit: "ppm",
    safeMax: 1000,
    warningMax: 2000,
    label: "Carbon Dioxide",
    description: "Indoor/ambient — normal outdoor: 400 ppm",
  },
};
