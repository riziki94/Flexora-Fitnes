import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";

// ── Supabase config from env (safe to use anon key client-side) ─────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Types ───────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// ── Client-side Supabase singleton ──────────────────────────────────────────
function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => getSupabaseClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: "Auth not configured — SUPABASE_URL missing" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: "Auth not configured — SUPABASE_URL missing" };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message };

      if (data.user) {
        try {
          await createProfile({ userId: data.user.id, email, fullName });
        } catch { /* non-fatal */ }
      }
      return {};
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const isAdmin = user?.email === "riziki94@gmail.com";

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      isAdmin: false,
      signIn: async () => ({ error: "Auth not initialized" }),
      signUp: async () => ({ error: "Auth not initialized" }),
      signOut: async () => {},
    };
  }
  return ctx;
}

// ── Server function to create a profile row ─────────────────────────────────
const createProfile = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { userId: string; email: string; fullName: string })
  .handler(async ({ data }) => {
    try {
      const { getServerClient } = await import("./supabase");
      const client = getServerClient();
      await client.auth.admin.updateUserById(data.userId, {
        user_metadata: { full_name: data.fullName, subscription_tier: "kitoslight" },
      });
    } catch (e) {
      console.error("Failed to set user metadata:", e);
    }
    return { ok: true };
  });
