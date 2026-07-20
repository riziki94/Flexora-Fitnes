import { getDb } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "flexora-dev-secret-change-in-production";

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function hmacSign(data: string, secret: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(data));
}

export async function createToken(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const signature = base64UrlEncode(await hmacSign(`${headerB64}.${payloadB64}`, JWT_SECRET));

  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const expectedSig = base64UrlEncode(await hmacSign(`${headerB64}.${payloadB64}`, JWT_SECRET));

    if (sigB64 !== expectedSig) return null;

    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = await createToken({ userId });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.query("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(
    userId,
    token,
    expiresAt
  );

  return token;
}

export async function getUserFromToken(token: string): Promise<{
  id: number;
  email: string;
  role: string;
  name: string;
  profile_picture?: string;
} | null> {
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;

  // Check session exists in DB
  const db = getDb();
  const session = db.query("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as { user_id: number } | undefined;
  if (!session) return null;

  const user = db.query("SELECT id, email, role, name, profile_picture FROM users WHERE id = ?").get(session.user_id) as {
    id: number;
    email: string;
    role: string;
    name: string;
    profile_picture: string;
  } | undefined;

  return user || null;
}
