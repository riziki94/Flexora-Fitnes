import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";

function getUserIdFromRequest(db: any): number {
  const request = (globalThis as any).__request;
  if (!request) throw new Error("No request context");

  const authHeader = request.headers.get("authorization") || request.headers.get("cookie");
  if (!authHeader) throw new Error("Not authenticated");

  let token: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (authHeader.includes("flexora_token=")) {
    const match = authHeader.match(/flexora_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) throw new Error("Not authenticated");

  const session = db.query("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as { user_id: number } | undefined;
  if (!session) throw new Error("Invalid session");

  return session.user_id;
}

export const getWeekSchedule = createServerFn()
  .validator((data: { weekStartDate: string }) => {
    if (!data.weekStartDate) throw new Error("weekStartDate required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const userId = getUserIdFromRequest(db);

    const entries = db.query(
      `SELECT * FROM schedule_entries 
       WHERE user_id = ? AND week_start_date = ? 
       ORDER BY day_of_week, time`
    ).all(userId, data.weekStartDate) as any[];

    return entries;
  });

export const addScheduleEntry = createServerFn()
  .validator((data: {
    dayOfWeek: number;
    weekStartDate: string;
    time: string;
    activityType: string;
    name: string;
    durationMinutes: number;
    notes?: string;
  }) => {
    if (data.dayOfWeek === undefined || data.dayOfWeek < 0 || data.dayOfWeek > 6) {
      throw new Error("dayOfWeek must be 0-6");
    }
    if (!data.weekStartDate) throw new Error("weekStartDate required");
    if (!data.time) throw new Error("time required");
    if (!data.activityType) throw new Error("activityType required");
    const validTypes = ['workout', 'rest', 'cardio', 'stretching', 'meal_prep', 'pt_session', 'other'];
    if (!validTypes.includes(data.activityType)) {
      throw new Error(`activityType must be one of: ${validTypes.join(', ')}`);
    }
    if (!data.name) throw new Error("name required");
    if (!data.durationMinutes || data.durationMinutes < 1) throw new Error("durationMinutes required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const userId = getUserIdFromRequest(db);

    const result = db.query(
      `INSERT INTO schedule_entries (user_id, day_of_week, week_start_date, time, activity_type, name, duration_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      data.dayOfWeek,
      data.weekStartDate,
      data.time,
      data.activityType,
      data.name,
      data.durationMinutes,
      data.notes || ""
    );

    const entry = db.query("SELECT * FROM schedule_entries WHERE id = ?").get(Number(result.lastInsertRowid));
    return entry;
  });

export const toggleComplete = createServerFn()
  .validator((data: { id: number }) => {
    if (!data.id) throw new Error("id required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const userId = getUserIdFromRequest(db);

    const existing = db.query("SELECT id, completed FROM schedule_entries WHERE id = ? AND user_id = ?").get(data.id, userId) as any;
    if (!existing) throw new Error("Entry not found");

    const newCompleted = existing.completed ? 0 : 1;
    db.query("UPDATE schedule_entries SET completed = ? WHERE id = ?").run(newCompleted, data.id);

    return { id: data.id, completed: newCompleted };
  });

export const deleteScheduleEntry = createServerFn()
  .validator((data: { id: number }) => {
    if (!data.id) throw new Error("id required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const userId = getUserIdFromRequest(db);

    const existing = db.query("SELECT id FROM schedule_entries WHERE id = ? AND user_id = ?").get(data.id, userId) as any;
    if (!existing) throw new Error("Entry not found");

    db.query("DELETE FROM schedule_entries WHERE id = ?").run(data.id);
    return { success: true };
  });

export const getWeekStats = createServerFn()
  .validator((data: { weekStartDate: string }) => {
    if (!data.weekStartDate) throw new Error("weekStartDate required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const userId = getUserIdFromRequest(db);

    const total = (db.query(
      "SELECT COUNT(*) as cnt FROM schedule_entries WHERE user_id = ? AND week_start_date = ?"
    ).get(userId, data.weekStartDate) as any)?.cnt || 0;

    const completed = (db.query(
      "SELECT COUNT(*) as cnt FROM schedule_entries WHERE user_id = ? AND week_start_date = ? AND completed = 1"
    ).get(userId, data.weekStartDate) as any)?.cnt || 0;

    return { total, completed };
  });
