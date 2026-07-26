import { createServerFn } from "@tanstack/react-start";
import { getUserFromToken } from "~/lib/auth";
import { getDb } from "~/lib/db";
import { getServerRequest } from "~/lib/request-context";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve a referral code to a user ID. Returns null if not found. */
function resolveReferralCode(code: string): { id: number; name: string } | null {
  const db = getDb();
  const user = db.query(
    "SELECT id, name FROM users WHERE referral_code = ? LIMIT 1"
  ).get(code) as { id: number; name: string } | undefined;
  return user || null;
}

/** Get referral stats for the currently logged-in user */
export const getReferralStats = createServerFn()
  .handler(async () => {
    const request = getServerRequest();
    if (!request) return null;

    const authHeader = request.headers.get("authorization") || request.headers.get("cookie");
    if (!authHeader) return null;

    let token: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (authHeader.includes("flexora_token=")) {
      const match = authHeader.match(/flexora_token=([^;]+)/);
      if (match) token = match[1];
    }
    if (!token) return null;

    const user = await getUserFromToken(token);
    if (!user) return null;

    const db = getDb();

    // Ensure user has a referral code
    let code = (db.query("SELECT referral_code FROM users WHERE id = ?").get(user.id) as any)?.referral_code || "";
    if (!code) {
      code = slugify(user.name) + "-" + user.id;
      db.query("UPDATE users SET referral_code = ? WHERE id = ?").run(code, user.id);
    }

    // Count referrals
    const countResult = db.query(
      "SELECT COUNT(*) as cnt FROM users WHERE referrer_id = ?"
    ).get(user.id) as { cnt: number };
    const referralCount = countResult?.cnt || 0;

    return {
      referralCode: code,
      referralCount,
      referralLink: `https://4b6e74dd2d7c803e38bdf306792a9d33.ctonew.app/register?ref=${code}`,
    };
  });

/** Look up referrer info by referral code (used on register page) */
export const lookupReferrer = createServerFn()
  .validator((data: { code: string }) => {
    if (!data.code) throw new Error("Referral code required");
    return data;
  })
  .handler(async ({ data }) => {
    const referrer = resolveReferralCode(data.code);
    if (!referrer) return null;
    return { id: referrer.id, name: referrer.name };
  });
