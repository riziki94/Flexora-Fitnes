import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "./supabase";

export interface DbDevice {
  id: string;
  device_code: string;
  ip_address: string;
  device_type: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  status: string;
  metrics: Record<string, number>;
  created_at: string;
}

export const getDevices = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from("devices")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getDevices error:", error.message);
      return [];
    }

    return (data as DbDevice[]) ?? [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("getDevices error:", message);
    return [];
  }
});
