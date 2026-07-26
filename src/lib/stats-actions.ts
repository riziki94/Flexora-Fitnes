import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";

export interface StatsOverview {
  totalPageViews: number;
  uniqueToday: number;
  viewsPerDay: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
}

export interface RecentVisit {
  id: number;
  event_type: string;
  path: string;
  user_agent: string;
  created_at: string;
}

export const getStatsOverview = createServerFn().handler(async (): Promise<StatsOverview> => {
  const db = getDb();

  const totalPageViews = (
    db.query(
      "SELECT COUNT(*) as cnt FROM analytics_events WHERE event_type = 'pageview'",
    ).get() as any
  )?.cnt || 0;

  const uniqueToday = (
    db.query(
      `SELECT COUNT(DISTINCT user_agent) as cnt FROM analytics_events
       WHERE date(created_at) = date('now')`,
    ).get() as any
  )?.cnt || 0;

  const viewsPerDay = db.query(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM analytics_events
     WHERE created_at >= date('now', '-7 days')
     GROUP BY date(created_at)
     ORDER BY date(created_at) ASC`,
  ).all() as { date: string; count: number }[];

  const topPages = db.query(
    `SELECT path, COUNT(*) as count
     FROM analytics_events
     WHERE path != ''
     GROUP BY path
     ORDER BY count DESC
     LIMIT 10`,
  ).all() as { path: string; count: number }[];

  return { totalPageViews, uniqueToday, viewsPerDay, topPages };
});

export const getRecentVisits = createServerFn().handler(async (): Promise<RecentVisit[]> => {
  const db = getDb();
  return db.query(
    `SELECT id, event_type, path, user_agent, created_at
     FROM analytics_events
     ORDER BY created_at DESC
     LIMIT 50`,
  ).all() as RecentVisit[];
});
