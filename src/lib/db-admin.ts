import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "./supabase";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  created_at: string;
}

export interface EsgReport {
  id: string;
  user_id: string;
  title: string;
  report_data: Record<string, unknown>;
  generated_at: string;
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  totalEnergyKWh: number;
  co2ReducedKg: number;
  activeCharging: number;
  usersRegistered: number;
}

// ── Profile ──────────────────────────────────────────────────────────
export const getProfile = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { userId: string })
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { data: profile, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .single();
    if (error) return null;
    return profile as Profile;
  });

// ── Users ────────────────────────────────────────────────────────────
export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  const client = getServerClient();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Profile[]) ?? [];
});

export const updateUserTier = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { userId: string; tier: string })
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { error } = await client
      .from("profiles")
      .update({ subscription_tier: data.tier })
      .eq("id", data.userId);
    return { ok: !error, error: error?.message };
  });

// ── Devices ──────────────────────────────────────────────────────────
export const addDevice = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) =>
      d as {
        ip_address: string;
        device_type: string;
        name: string;
        city: string;
      },
  )
  .handler(async ({ data }) => {
    const client = getServerClient();
    const prefix =
      data.device_type === "smart-bench"
        ? "SB"
        : data.device_type === "bus-shelter"
          ? "BS"
          : "SP";
    const cityPart = (data.city || "UNK").substring(0, 3).toUpperCase();
    const deviceCode = `${prefix}-${cityPart}-${Date.now().toString(36).toUpperCase()}`;
    const { data: inserted, error } = await client
      .from("devices")
      .insert({
        device_code: deviceCode,
        ip_address: data.ip_address,
        device_type: data.device_type,
        name: data.name,
        city: data.city,
        status: "offline",
        metrics: {
          solarEnergyKW: 0,
          chargingSessions: 0,
          co2ppm: 400,
          no2ppb: 0,
          so2ppb: 0,
          h2sppb: 0,
          pm25: 0,
          temperatureC: 20,
          humidity: 50,
        },
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, device: inserted };
  });

export const updateDevice = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) =>
      d as { id: string; updates: Record<string, unknown> },
  )
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { error } = await client
      .from("devices")
      .update(data.updates)
      .eq("id", data.id);
    return { ok: !error, error: error?.message };
  });

// ── Stats ────────────────────────────────────────────────────────────
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const client = getServerClient();

    const { data: devices } = await client.from("devices").select("*");
    const { count: userCount } = await client
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const deviceList = (devices as Record<string, unknown>[]) ?? [];
    const online = deviceList.filter((d) => d.status === "online").length;

    let totalEnergy = 0;
    let totalCharging = 0;

    for (const d of deviceList) {
      const m = (d.metrics || {}) as Record<string, number>;
      totalEnergy += m.solarEnergyKW || 0;
      totalCharging += m.chargingSessions || 0;
    }

    const co2 = totalEnergy * 0.7;

    return {
      totalDevices: deviceList.length,
      onlineDevices: online,
      totalEnergyKWh: Math.round(totalEnergy * 100) / 100,
      co2ReducedKg: Math.round(co2 * 100) / 100,
      activeCharging: totalCharging,
      usersRegistered: userCount ?? 0,
    } satisfies DashboardStats;
  },
);

// ── ESG Reports ──────────────────────────────────────────────────────
export const saveEsgReport = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) =>
      d as { userId: string; title: string; reportData: Record<string, unknown> },
  )
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { data: inserted, error } = await client
      .from("esg_reports")
      .insert({
        user_id: data.userId,
        title: data.title,
        report_data: data.reportData,
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, report: inserted };
  });

export const getEsgReports = createServerFn({ method: "GET" }).handler(
  async () => {
    const client = getServerClient();
    const { data, error } = await client
      .from("esg_reports")
      .select("*")
      .order("generated_at", { ascending: false });
    if (error) return [];
    return (data as EsgReport[]) ?? [];
  },
);

// ── Live Data Simulation ─────────────────────────────────────────────
export const simulateLiveData = createServerFn({ method: "POST" }).handler(
  async () => {
    const client = getServerClient();
    const { data: devices } = await client
      .from("devices")
      .select("id, status");
    if (!devices) return { ok: false };

    let updated = 0;
    for (const d of devices) {
      if (d.status !== "online") continue;
      const newMetrics = {
        solarEnergyKW: Math.round((Math.random() * 2 + 0.05) * 100) / 100,
        chargingSessions: Math.floor(Math.random() * 40),
        co2ppm: Math.round(Math.random() * 50 + 390),
        no2ppb: Math.round(Math.random() * 60 + 5),
        so2ppb: Math.round(Math.random() * 20 + 1),
        h2sppb: Math.round(Math.random() * 10),
        pm25: Math.round(Math.random() * 30 + 2),
        temperatureC: Math.round((Math.random() * 25 + 5) * 10) / 10,
        humidity: Math.round(Math.random() * 60 + 30),
      };
      await client
        .from("devices")
        .update({ metrics: newMetrics })
        .eq("id", d.id);
      updated++;
    }

    return { ok: true, message: `Updated ${updated} online devices` };
  },
);
