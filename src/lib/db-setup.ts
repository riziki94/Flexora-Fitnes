import { createServerFn } from "@tanstack/react-start";
import { executeSql } from "./supabase";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS container_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  interior_config JSONB,
  exterior_config JSONB,
  total_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT,
  ip_address TEXT,
  device_type TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'offline',
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_data JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const SEED_DEVICES_SQL = `
INSERT INTO devices (device_code, ip_address, device_type, name, city, lat, lng, status, metrics) VALUES
  ('SB-OSL-001', '10.42.1.101', 'smart-bench', 'Frogner Park Smart Bench', 'Oslo', 59.9227, 10.7043, 'online', '{"solarEnergyKW":0.42,"chargingSessions":18,"co2ppm":418,"no2ppb":32,"temperatureC":14.2}'),
  ('SB-BGO-001', '10.42.2.101', 'smart-bench', 'Bryggen Smart Bench', 'Bergen', 60.3975, 5.3234, 'online', '{"solarEnergyKW":0.31,"chargingSessions":12,"co2ppm":405,"no2ppb":22,"temperatureC":12.8}'),
  ('SB-TRD-001', '10.42.3.101', 'smart-bench', 'Nidaros Smart Bench', 'Trondheim', 63.4269, 10.3973, 'online', '{"solarEnergyKW":0.28,"chargingSessions":9,"co2ppm":402,"no2ppb":18,"temperatureC":10.5}'),
  ('SB-SVG-001', '10.42.4.101', 'smart-bench', 'Øvre Holmegate Bench', 'Stavanger', 58.9725, 5.733, 'offline', '{"solarEnergyKW":0,"chargingSessions":0,"co2ppm":0,"no2ppb":0,"temperatureC":0}'),
  ('BS-OSL-001', '10.42.1.201', 'bus-shelter', 'Jernbanetorget Bus Shelter', 'Oslo', 59.912, 10.7505, 'online', '{"solarEnergyKW":1.85,"chargingSessions":34,"co2ppm":425,"no2ppb":45,"temperatureC":15.1}'),
  ('BS-BGO-001', '10.42.2.201', 'bus-shelter', 'Bystasjonen Bus Shelter', 'Bergen', 60.3897, 5.332, 'online', '{"solarEnergyKW":1.42,"chargingSessions":27,"co2ppm":410,"no2ppb":28,"temperatureC":13.0}'),
  ('BS-TRD-001', '10.42.3.201', 'bus-shelter', 'Solsiden Bus Shelter', 'Trondheim', 63.4346, 10.4115, 'online', '{"solarEnergyKW":1.15,"chargingSessions":21,"co2ppm":408,"no2ppb":20,"temperatureC":11.2}'),
  ('BS-TMS-001', '10.42.5.201', 'bus-shelter', 'Storgata Bus Shelter', 'Tromsø', 69.649, 18.955, 'online', '{"solarEnergyKW":0.95,"chargingSessions":15,"co2ppm":398,"no2ppb":12,"temperatureC":6.8}'),
  ('SP-OSL-001', '10.42.1.301', 'sensor-pole', 'Grønland Sensor Pole', 'Oslo', 59.9127, 10.76, 'online', '{"solarEnergyKW":0.12,"chargingSessions":0,"co2ppm":432,"no2ppb":52,"temperatureC":15.6}'),
  ('SP-BGO-001', '10.42.2.301', 'sensor-pole', 'Nygårdshøyden Sensor Pole', 'Bergen', 60.386, 5.325, 'online', '{"solarEnergyKW":0.09,"chargingSessions":0,"co2ppm":412,"no2ppb":25,"temperatureC":13.2}'),
  ('SP-TMS-001', '10.42.5.301', 'sensor-pole', 'UiT Campus Sensor Pole', 'Tromsø', 69.68, 18.971, 'online', '{"solarEnergyKW":0.07,"chargingSessions":0,"co2ppm":395,"no2ppb":8,"temperatureC":5.2}')
ON CONFLICT DO NOTHING;
`;

export const setupDatabase = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      await executeSql(SCHEMA_SQL);

      const countResult = (await executeSql(
        "SELECT count(*) as cnt FROM devices",
      )) as { rows: { cnt: string }[] };
      const existingCount = parseInt(countResult.rows[0]?.cnt ?? "0", 10);

      if (existingCount === 0) {
        await executeSql(SEED_DEVICES_SQL);
      }

      return {
        ok: true,
        message:
          existingCount === 0
            ? "Schema created and 11 devices seeded"
            : "Schema verified, devices already seeded",
        deviceCount: existingCount === 0 ? 11 : existingCount,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("setupDatabase error:", message);
      return { ok: false, error: message };
    }
  },
);
