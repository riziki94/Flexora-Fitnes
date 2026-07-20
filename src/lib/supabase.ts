import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key.
 * Only use inside createServerFn handlers or API routes.
 */
export function getServerClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Executes raw SQL on the Supabase PostgreSQL database.
 * Uses the service role key to connect directly via pg.
 */
export async function executeSql(query: string): Promise<unknown> {
  const { Pool } = await import("pg");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  // Extract project ref from URL like https://<ref>.supabase.co
  const projectRef = new URL(url).hostname.split(".")[0];
  const pool = new Pool({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: key,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  try {
    const result = await pool.query(query);
    return result;
  } finally {
    await pool.end();
  }
}
