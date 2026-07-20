import { createServerFn } from "@tanstack/react-start";
import { getUserFromToken } from "~/lib/auth";
import { getDb } from "~/lib/db";
import { getServerRequest } from "~/lib/request-context";

// --- Auth helper ---
async function getAuthUser() {
  const request = getServerRequest();
  if (!request) throw new Error("No request context");
  let token: string | null = null;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/flexora_token=([^;]+)/);
  if (match) token = match[1];
  if (!token) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  if (!token) throw new Error("Unauthorized");
  const user = await getUserFromToken(token);
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ── Rate a PT after a session ─────────────────────────────
export const ratePtSession = createServerFn()
  .validator((data: {
    ptUserId: number;
    sessionId?: number;
    rating: "good" | "okay" | "bad";
    comment?: string;
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "client") throw new Error("Only clients can rate PTs");
    const db = getDb();

    // Check if already rated for this session (if sessionId provided)
    if (data.sessionId) {
      const existing = db.query(
        "SELECT id FROM pt_ratings WHERE session_id = ? AND client_user_id = ? AND pt_user_id = ?"
      ).get(data.sessionId, user.id, data.ptUserId) as any;
      if (existing) throw new Error("Already rated this session");
    }

    db.query(
      `INSERT INTO pt_ratings (pt_user_id, client_user_id, session_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`
    ).run(data.ptUserId, user.id, data.sessionId || null, data.rating, data.comment || "");

    return { success: true };
  });

// ── Check if user already rated a session ─────────────────
export const hasUserRatedSession = createServerFn()
  .validator((data: { sessionId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();
    const existing = db.query(
      "SELECT rating, comment FROM pt_ratings WHERE session_id = ? AND client_user_id = ?"
    ).get(data.sessionId, user.id) as any;
    return existing ? { rated: true, rating: existing.rating, comment: existing.comment } : { rated: false };
  });

// ── Check if user already rated a booking ──────────────────
export const hasUserRatedBooking = createServerFn()
  .validator((data: { bookingId: number; ptUserId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();
    const existing = db.query(
      "SELECT rating, comment FROM pt_ratings WHERE session_id = ? AND client_user_id = ? AND pt_user_id = ?"
    ).get(data.bookingId, user.id, data.ptUserId) as any;
    return existing ? { rated: true, rating: existing.rating, comment: existing.comment } : { rated: false };
  });

// ── Get PT satisfaction (monthly) ──────────────────────────
export const getPtSatisfaction = createServerFn()
  .validator((data: { ptUserId: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().slice(0, 19).replace("T", " ");

    // Monthly stats
    const monthly = db.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN rating = 'good' THEN 1 ELSE 0 END) as good_count,
         SUM(CASE WHEN rating = 'okay' THEN 1 ELSE 0 END) as okay_count,
         SUM(CASE WHEN rating = 'bad' THEN 1 ELSE 0 END) as bad_count
       FROM pt_ratings
       WHERE pt_user_id = ? AND created_at >= ?`
    ).get(data.ptUserId, monthStartStr) as any;

    // All-time stats
    const allTime = db.query(
      `SELECT COUNT(*) as total FROM pt_ratings WHERE pt_user_id = ?`
    ).get(data.ptUserId) as any;

    const total = monthly?.total || 0;
    const good = monthly?.good_count || 0;
    const okay = monthly?.okay_count || 0;
    const bad = monthly?.bad_count || 0;

    // Satisfaction % = (good * 1.0 + okay * 0.5) / total * 100
    const satisfactionPct = total > 0
      ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100)
      : 0;

    // Color: green >= 80%, yellow >= 50%, red < 50%
    let color: "green" | "yellow" | "red" = "green";
    if (satisfactionPct < 50) color = "red";
    else if (satisfactionPct < 80) color = "yellow";

    return {
      monthly: { total, good, okay, bad },
      satisfactionPct,
      color,
      allTimeTotal: allTime?.total || 0,
    };
  });

// ── PT Leaderboard ─────────────────────────────────────────
export const getPtLeaderboard = createServerFn()
  .validator((data: {
    country?: string;
    period?: "monthly" | "alltime";
  }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const period = data.period || "monthly";

    let dateFilter = "";
    const params: any[] = [];

    if (period === "monthly") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      dateFilter = " AND r.created_at >= ?";
      params.push(monthStart.toISOString().slice(0, 19).replace("T", " "));
    }

    let countryFilter = "";
    if (data.country) {
      countryFilter = " AND u.country = ?";
      params.push(data.country);
    }

    const query = `
      SELECT
        u.id,
        u.name,
        u.country,
        p.years_of_experience,
        COUNT(r.id) as total_ratings,
        SUM(CASE WHEN r.rating = 'good' THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN r.rating = 'okay' THEN 1 ELSE 0 END) as okay_count,
        SUM(CASE WHEN r.rating = 'bad' THEN 1 ELSE 0 END) as bad_count
      FROM users u
      JOIN pt_profiles p ON u.id = p.user_id
      LEFT JOIN pt_ratings r ON r.pt_user_id = u.id ${dateFilter}
      WHERE u.role = 'pt' AND p.verification_status = 'approved' ${countryFilter}
        AND u.profile_picture IS NOT NULL AND u.profile_picture != ''
      GROUP BY u.id
      HAVING COUNT(r.id) > 0
      ORDER BY
        (SUM(CASE WHEN r.rating = 'good' THEN 1.0 ELSE 0 END) + SUM(CASE WHEN r.rating = 'okay' THEN 0.5 ELSE 0 END)) / COUNT(r.id) DESC,
        COUNT(r.id) DESC
    `;

    const rows = db.query(query).all(...params) as any[];

    return rows.map((row: any, index: number) => {
      const total = row.total_ratings || 0;
      const good = row.good_count || 0;
      const okay = row.okay_count || 0;
      const satisfactionPct = total > 0
        ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100)
        : 0;

      return {
        rank: index + 1,
        id: row.id,
        name: row.name,
        country: row.country,
        ratingPct: satisfactionPct,
        totalRatings: total,
        yearsOfExperience: row.years_of_experience || 0,
      };
    });
  });

// ── Get available countries for PT leaderboard filter ─────
export const getPtLeaderboardCountries = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      `SELECT DISTINCT u.country FROM users u
       JOIN pt_profiles p ON u.id = p.user_id
       JOIN pt_ratings r ON r.pt_user_id = u.id
       WHERE u.role = 'pt' AND p.verification_status = 'approved' AND u.country != ''
         AND u.profile_picture IS NOT NULL AND u.profile_picture != ''
       ORDER BY u.country`
    ).all() as any[];
    return rows.map((r: any) => r.country);
  });

// ── Get featured PTs for landing page ─────────────────────
export type FeaturedPT = {
  id: number;
  name: string;
  country: string;
  profilePicture: string;
  yearsOfExperience: number;
  ratingPct: number;
  totalRatings: number;
};

export const getFeaturedPTs = createServerFn()
  .handler(async (): Promise<FeaturedPT[]> => {
    const db = getDb();

    const rows = db.query(`
      SELECT
        u.id,
        u.name,
        u.country,
        u.profile_picture,
        p.years_of_experience,
        COUNT(r.id) as total_ratings,
        SUM(CASE WHEN r.rating = 'good' THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN r.rating = 'okay' THEN 1 ELSE 0 END) as okay_count
      FROM users u
      JOIN pt_profiles p ON u.id = p.user_id
      LEFT JOIN pt_ratings r ON r.pt_user_id = u.id
      WHERE u.role = 'pt' AND p.verification_status = 'approved'
        AND u.profile_picture IS NOT NULL AND u.profile_picture != ''
      GROUP BY u.id
      ORDER BY
        CASE WHEN COUNT(r.id) > 0
          THEN (SUM(CASE WHEN r.rating = 'good' THEN 1.0 ELSE 0 END) + SUM(CASE WHEN r.rating = 'okay' THEN 0.5 ELSE 0 END)) * 1.0 / COUNT(r.id)
          ELSE 0
        END DESC,
        COUNT(r.id) DESC
      LIMIT 6
    `).all() as any[];

    return rows.map((row: any) => {
      const total = row.total_ratings || 0;
      const good = row.good_count || 0;
      const okay = row.okay_count || 0;
      const ratingPct = total > 0
        ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100)
        : 0;

      return {
        id: row.id,
        name: row.name,
        country: row.country || '',
        profilePicture: row.profile_picture || '',
        yearsOfExperience: row.years_of_experience || 0,
        ratingPct,
        totalRatings: total,
      };
    });
  });
