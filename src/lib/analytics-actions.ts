import { createServerFn } from "@tanstack/react-start";
import { getUserFromToken } from "~/lib/auth";
import { getDb } from "~/lib/db";

function getUserId(): number | null {
  const request = (globalThis as any).__request;
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
  return token ? getUserFromToken(token).then(u => u?.id || null) : null;
}

export const checkAdminAccess = createServerFn().handler(async () => {
  const request = (globalThis as any).__request;
  if (!request) throw new Error("No request context");
  const authHeader = request.headers.get("authorization") || request.headers.get("cookie");
  if (!authHeader) throw new Error("Unauthorized");
  let token: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (authHeader.includes("flexora_token=")) {
    const match = authHeader.match(/flexora_token=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) throw new Error("Unauthorized");
  const user = await getUserFromToken(token);
  if (!user) throw new Error("Unauthorized");
  const db = getDb();
  const admin = db.query("SELECT user_id FROM admin_users WHERE user_id = ?").get(user.id);
  if (!admin) throw new Error("Admin access required");
  return { user };
});

export const getAnalyticsOverview = createServerFn().handler(async () => {
  const db = getDb();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = thisWeekStart.toISOString().slice(0, 10);

  // Total users
  const totalUsers = (db.query("SELECT COUNT(*) as cnt FROM users").get() as any)?.cnt || 0;
  const lastMonthUsers = (db.query(
    "SELECT COUNT(*) as cnt FROM users WHERE created_at < ?", [thisMonthStart]
  ).get() as any)?.cnt || 0;

  // Active this month (users who had a workout session, booking, or logged in this month)
  const activeThisMonth = (db.query(
    `SELECT COUNT(DISTINCT user_id) as cnt FROM (
      SELECT user_id FROM workout_sessions WHERE started_at >= ?
      UNION SELECT client_id as user_id FROM pt_bookings WHERE created_at >= ?
      UNION SELECT user_id FROM chat_messages WHERE created_at >= ?
    )`,
    [thisMonthStart, thisMonthStart, thisMonthStart]
  ).get() as any)?.cnt || 0;

  const activeLastMonth = (db.query(
    `SELECT COUNT(DISTINCT user_id) as cnt FROM (
      SELECT user_id FROM workout_sessions WHERE started_at >= ? AND started_at < ?
      UNION SELECT client_id as user_id FROM pt_bookings WHERE created_at >= ? AND created_at < ?
      UNION SELECT user_id FROM chat_messages WHERE created_at >= ? AND created_at < ?
    )`,
    [lastMonthStart, thisMonthStart, lastMonthStart, thisMonthStart, lastMonthStart, thisMonthStart]
  ).get() as any)?.cnt || 0;

  // New signups this week
  const newThisWeek = (db.query(
    "SELECT COUNT(*) as cnt FROM users WHERE created_at >= ?", [weekStartStr]
  ).get() as any)?.cnt || 0;

  const newLastWeek = (db.query(
    "SELECT COUNT(*) as cnt FROM users WHERE created_at >= ? AND created_at < ?",
    [new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10), weekStartStr]
  ).get() as any)?.cnt || 0;

  // Verified PTs
  const totalPTs = (db.query(
    "SELECT COUNT(*) as cnt FROM pt_profiles WHERE verification_status = 'approved'"
  ).get() as any)?.cnt || 0;

  const lastMonthPTs = (db.query(
    "SELECT COUNT(*) as cnt FROM pt_profiles WHERE verification_status = 'approved' AND created_at < ?",
    [thisMonthStart]
  ).get() as any)?.cnt || 0;

  // Booked sessions this month
  const bookedThisMonth = (db.query(
    "SELECT COUNT(*) as cnt FROM pt_bookings WHERE created_at >= ?",
    [thisMonthStart]
  ).get() as any)?.cnt || 0;

  const bookedLastMonth = (db.query(
    "SELECT COUNT(*) as cnt FROM pt_bookings WHERE created_at >= ? AND created_at < ?",
    [lastMonthStart, thisMonthStart]
  ).get() as any)?.cnt || 0;

  // Revenue estimate
  const subRevenue = (db.query(
    `SELECT 
      SUM(CASE WHEN plan = 'basis' THEN 149 WHEN plan = 'hybrid' THEN 249 WHEN plan = 'premium' THEN 399 WHEN plan = 'pt' THEN 199 ELSE 0 END) as total
    FROM subscriptions WHERE status = 'active'`
  ).get() as any)?.total || 0;

  const bookingRevenue = (db.query(
    "SELECT COALESCE(SUM(price), 0) as total FROM pt_bookings WHERE payment_status = 'paid' AND created_at >= ?",
    [thisMonthStart]
  ).get() as any)?.total || 0;

  const lastMonthBookingRevenue = (db.query(
    "SELECT COALESCE(SUM(price), 0) as total FROM pt_bookings WHERE payment_status = 'paid' AND created_at >= ? AND created_at < ?",
    [lastMonthStart, thisMonthStart]
  ).get() as any)?.total || 0;

  const revenue = Number(subRevenue) + Number(bookingRevenue);
  const lastMonthRevenue = Number(subRevenue) + Number(lastMonthBookingRevenue);

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  return {
    totalUsers: { value: totalUsers, change: pctChange(totalUsers, lastMonthUsers) },
    activeThisMonth: { value: activeThisMonth, change: pctChange(activeThisMonth, activeLastMonth) },
    newThisWeek: { value: newThisWeek, change: pctChange(newThisWeek, newLastWeek) },
    verifiedPTs: { value: totalPTs, change: pctChange(totalPTs, lastMonthPTs) },
    bookedSessions: { value: bookedThisMonth, change: pctChange(bookedThisMonth, bookedLastMonth) },
    revenue: { value: Math.round(revenue), change: pctChange(Math.round(revenue), Math.round(lastMonthRevenue)) },
  };
});

export const getUserGrowth = createServerFn().handler(async () => {
  const db = getDb();
  const weeks: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);
    const count = (db.query(
      "SELECT COUNT(*) as cnt FROM users WHERE created_at >= ? AND created_at < ?",
      [startStr, endStr]
    ).get() as any)?.cnt || 0;
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks.push({ label, count });
  }
  return weeks;
});

export const getRevenueTrend = createServerFn().handler(async () => {
  const db = getDb();
  const months: { label: string; subscriptions: number; bookings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const startStr = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const endStr = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);

    const subRevenue = (db.query(
      `SELECT COALESCE(SUM(CASE WHEN plan = 'basis' THEN 149 WHEN plan = 'hybrid' THEN 249 WHEN plan = 'premium' THEN 399 WHEN plan = 'pt' THEN 199 ELSE 0 END), 0) as total
       FROM subscriptions WHERE status = 'active' AND started_at < ?`,
      [endStr]
    ).get() as any)?.total || 0;

    const bookingRevenue = (db.query(
      "SELECT COALESCE(SUM(price), 0) as total FROM pt_bookings WHERE payment_status = 'paid' AND created_at >= ? AND created_at < ?",
      [startStr, endStr]
    ).get() as any)?.total || 0;

    const label = d.toLocaleDateString("en-US", { month: "short" });
    months.push({ label, subscriptions: Number(subRevenue), bookings: Number(bookingRevenue) });
  }
  return months;
});

export const getConversionFunnel = createServerFn().handler(async () => {
  const db = getDb();
  // We estimate visitors from signups (no visitor tracking table, so use signup as base)
  const totalSignups = (db.query("SELECT COUNT(*) as cnt FROM users").get() as any)?.cnt || 0;
  const paidUsers = (db.query(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM subscriptions WHERE status = 'active'"
  ).get() as any)?.cnt || 0;
  const activeUsers = (db.query(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM workout_sessions WHERE started_at >= date('now', '-30 days')"
  ).get() as any)?.cnt || 0;

  // Estimate visitors as ~3x signups (industry avg)
  const visitors = Math.max(totalSignups * 3, totalSignups + 10);

  return [
    { label: "Visitors", value: visitors },
    { label: "Signups", value: totalSignups },
    { label: "Paid", value: paidUsers },
    { label: "Active", value: activeUsers },
  ];
});

export const getRetentionCohorts = createServerFn().handler(async () => {
  const db = getDb();
  // Get users who signed up 4+ weeks ago
  const users = db.query(
    "SELECT id, created_at FROM users WHERE created_at < date('now', '-28 days') ORDER BY created_at DESC LIMIT 50"
  ).all() as any[];

  if (users.length === 0) return { cohorts: [], averages: [0, 0, 0, 0] };

  const weeks = [1, 2, 3, 4];
  const retentionByWeek: number[] = [0, 0, 0, 0];

  for (const user of users) {
    const signupDate = new Date(user.created_at);
    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(signupDate);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);

      const active = db.query(
        "SELECT COUNT(*) as cnt FROM workout_sessions WHERE user_id = ? AND started_at >= ? AND started_at < ?",
        [user.id, startStr, endStr]
      ).get() as any;

      if (active?.cnt > 0) retentionByWeek[w]++;
    }
  }

  const averages = retentionByWeek.map(r => Math.round((r / users.length) * 100));
  return { cohorts: users.length, averages };
});

export const getTopPTs = createServerFn().handler(async () => {
  const db = getDb();
  const pts = db.query(`
    SELECT u.id, u.name, u.country,
      COUNT(pr.id) as total_ratings,
      SUM(CASE WHEN pr.rating = 'good' THEN 1 ELSE 0 END) as good_ratings,
      SUM(CASE WHEN pr.rating = 'okay' THEN 1 ELSE 0 END) as okay_ratings,
      SUM(CASE WHEN pr.rating = 'bad' THEN 1 ELSE 0 END) as bad_ratings
    FROM users u
    JOIN pt_ratings pr ON u.id = pr.pt_user_id
    GROUP BY u.id
    ORDER BY (CAST(SUM(CASE WHEN pr.rating = 'good' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(pr.id)) DESC, COUNT(pr.id) DESC
    LIMIT 10
  `).all() as any[];

  return pts.map((pt: any) => ({
    id: pt.id,
    name: pt.name,
    country: pt.country || "—",
    totalRatings: pt.total_ratings,
    satisfaction: pt.total_ratings > 0
      ? Math.round((pt.good_ratings / pt.total_ratings) * 100)
      : 0,
  }));
});

export const getCountryDistribution = createServerFn().handler(async () => {
  const db = getDb();
  const countries = db.query(
    "SELECT country, COUNT(*) as cnt FROM users WHERE country != '' GROUP BY country ORDER BY cnt DESC"
  ).all() as any[];

  const noCountry = (db.query(
    "SELECT COUNT(*) as cnt FROM users WHERE country = '' OR country IS NULL"
  ).get() as any)?.cnt || 0;

  const result = countries.map((c: any) => ({ name: c.country, value: c.cnt }));
  if (noCountry > 0) result.push({ name: "Unknown", value: noCountry });

  return result;
});

export const getRecentActivity = createServerFn().handler(async () => {
  const db = getDb();

  // Activity from activity_log and recent signups/bookings
  const logEntries = db.query(`
    SELECT event_type, description, created_at, 
      (SELECT u.name FROM users u WHERE u.id = activity_log.user_id) as user_name
    FROM activity_log ORDER BY created_at DESC LIMIT 20
  `).all() as any[];

  if (logEntries.length >= 10) {
    return logEntries.map((e: any) => ({
      type: e.event_type,
      description: e.description,
      user: e.user_name || "Unknown",
      time: e.created_at,
    }));
  }

  // Fallback: build from real tables
  const activities: { type: string; description: string; user: string; time: string }[] = [];

  const signups = db.query(`
    SELECT 'signup' as type, name || ' signed up' as description, name as user, created_at as time
    FROM users ORDER BY created_at DESC LIMIT 10
  `).all() as any[];
  activities.push(...signups);

  const bookings = db.query(`
    SELECT 'booking' as type, 
      (SELECT name FROM users WHERE id = pb.client_id) || ' booked PT session with ' || (SELECT name FROM users WHERE id = pb.pt_id) as description,
      (SELECT name FROM users WHERE id = pb.client_id) as user,
      pb.created_at as time
    FROM pt_bookings pb ORDER BY pb.created_at DESC LIMIT 10
  `).all() as any[];
  activities.push(...bookings);

  const sessions = db.query(`
    SELECT 'session_completed' as type,
      u.name || ' completed a workout' as description,
      u.name as user,
      ws.started_at as time
    FROM workout_sessions ws JOIN users u ON ws.user_id = u.id
    WHERE ws.ended_at IS NOT NULL
    ORDER BY ws.started_at DESC LIMIT 10
  `).all() as any[];
  activities.push(...sessions);

  const subs = db.query(`
    SELECT 'subscription' as type,
      u.name || ' subscribed to ' || s.plan as description,
      u.name as user,
      s.started_at as time
    FROM subscriptions s JOIN users u ON s.user_id = u.id
    ORDER BY s.started_at DESC LIMIT 10
  `).all() as any[];
  activities.push(...subs);

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return activities.slice(0, 20);
});
