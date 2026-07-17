import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getCurrentUser } from "~/lib/user-actions";

// ── Leaderboard ──

export const getLeaderboard = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      `SELECT u.id, u.name, u.country, up.points, up.workouts_completed,
        (SELECT COUNT(*) + 1 FROM user_points up2 WHERE up2.points > up.points) as rank
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       ORDER BY up.points DESC
       LIMIT 200`
    ).all() as any[];
    return rows.map((r: any) => ({ ...r }));
  });

export const getLeaderboardByCountry = createServerFn()
  .validator((data: { country: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const rows = db.query(
      `SELECT u.id, u.name, u.country, up.points, up.workouts_completed,
        (SELECT COUNT(*) + 1 FROM user_points up2
         JOIN users u2 ON up2.user_id = u2.id
         WHERE up2.points > up.points AND u2.country = ?) as rank
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       WHERE u.country = ?
       ORDER BY up.points DESC
       LIMIT 200`
    ).all(data.country, data.country) as any[];
    return rows.map((r: any) => ({ ...r }));
  });

// ── Competitions ──

export const getCompetitions = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      `SELECT c.*, u.name as creator_name,
        (SELECT COUNT(*) FROM competition_participants WHERE competition_id = c.id) as participant_count
       FROM competitions c
       JOIN users u ON c.creator_id = u.id
       ORDER BY
         CASE c.status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
         c.start_date ASC`
    ).all() as any[];
    return rows.map((r: any) => ({
      ...r,
      start_date: String(r.start_date),
      end_date: String(r.end_date),
      created_at: String(r.created_at),
    }));
  });

export const getMyCompetitions = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const db = getDb();
    const rows = db.query(
      `SELECT c.*, u.name as creator_name,
        (SELECT COUNT(*) FROM competition_participants WHERE competition_id = c.id) as participant_count
       FROM competitions c
       JOIN users u ON c.creator_id = u.id
       JOIN competition_participants cp ON c.id = cp.competition_id AND cp.user_id = ?
       ORDER BY
         CASE c.status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
         c.start_date ASC`
    ).all(user.id) as any[];
    return rows.map((r: any) => ({
      ...r,
      start_date: String(r.start_date),
      end_date: String(r.end_date),
      created_at: String(r.created_at),
    }));
  });

export const getCompetitionDetail = createServerFn()
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const comp = db.query(
      `SELECT c.*, u.name as creator_name
       FROM competitions c
       JOIN users u ON c.creator_id = u.id
       WHERE c.id = ?`
    ).get(data.id) as any;
    if (!comp) throw new Error("Competition not found");

    const participants = db.query(
      `SELECT cp.*, u.name, u.country, u.profile_picture
       FROM competition_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.competition_id = ?
       ORDER BY cp.score DESC`
    ).all(data.id) as any[];

    const activity = db.query(
      `SELECT ca.*, u.name as user_name
       FROM competition_activity ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.competition_id = ?
       ORDER BY ca.created_at DESC
       LIMIT 50`
    ).all(data.id) as any[];

    return {
      competition: {
        ...comp,
        start_date: String(comp.start_date),
        end_date: String(comp.end_date),
        created_at: String(comp.created_at),
        participant_count: participants.length,
      },
      participants: participants.map((p: any) => ({ ...p, joined_at: String(p.joined_at) })),
      activity: activity.map((a: any) => ({ ...a, created_at: String(a.created_at) })),
    };
  });

export const createCompetition = createServerFn()
  .validator((data: {
    name: string;
    description: string;
    type: string;
    startDate: string;
    endDate: string;
    prize: string;
    countryScope: string;
    maxParticipants: number;
  }) => {
    if (!data.name || !data.type || !data.startDate || !data.endDate) {
      throw new Error("Name, type, start date, and end date are required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const result = db.query(
      `INSERT INTO competitions (creator_id, name, description, type, start_date, end_date, prize, country_scope, max_participants, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
         CASE WHEN ? <= date('now') AND ? >= date('now') THEN 'active'
              WHEN ? > date('now') THEN 'upcoming'
              ELSE 'ended' END)`
    ).run(
      user.id,
      data.name,
      data.description,
      data.type,
      data.startDate,
      data.endDate,
      data.prize,
      data.countryScope,
      data.maxParticipants,
      data.startDate,
      data.endDate,
      data.startDate,
    );

    return { id: Number(result.lastInsertRowid) };
  });

export const joinCompetition = createServerFn()
  .validator((data: { competitionId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const comp = db.query("SELECT * FROM competitions WHERE id = ?").get(data.competitionId) as any;
    if (!comp) throw new Error("Competition not found");
    if (comp.status === "ended") throw new Error("Competition has ended");

    // Check max participants
    if (comp.max_participants > 0) {
      const count = db.query(
        "SELECT COUNT(*) as cnt FROM competition_participants WHERE competition_id = ?"
      ).get(data.competitionId) as any;
      if (count.cnt >= comp.max_participants) throw new Error("Competition is full");
    }

    // Check if already joined
    const existing = db.query(
      "SELECT id FROM competition_participants WHERE competition_id = ? AND user_id = ?"
    ).get(data.competitionId, user.id);
    if (existing) throw new Error("Already joined this competition");

    db.query(
      "INSERT INTO competition_participants (competition_id, user_id) VALUES (?, ?)"
    ).run(data.competitionId, user.id);

    // Activity feed
    db.query(
      "INSERT INTO competition_activity (competition_id, user_id, activity_type, description) VALUES (?, ?, 'join', ?)"
    ).run(data.competitionId, user.id, `${user.name} joined the competition`);

    return { success: true };
  });

export const leaveCompetition = createServerFn()
  .validator((data: { competitionId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    db.query(
      "DELETE FROM competition_participants WHERE competition_id = ? AND user_id = ?"
    ).run(data.competitionId, user.id);

    db.query(
      "INSERT INTO competition_activity (competition_id, user_id, activity_type, description) VALUES (?, ?, 'join', ?)"
    ).run(data.competitionId, user.id, `${user.name} left the competition`);

    return { success: true };
  });

export const isUserInCompetition = createServerFn()
  .validator((data: { competitionId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) return false;

    const db = getDb();
    const row = db.query(
      "SELECT id FROM competition_participants WHERE competition_id = ? AND user_id = ?"
    ).get(data.competitionId, user.id);
    return !!row;
  });

// Points helpers
export const getUserPoints = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    const db = getDb();
    const row = db.query("SELECT * FROM user_points WHERE user_id = ?").get(user.id) as any;
    if (!row) {
      // Create user_points row
      db.query("INSERT INTO user_points (user_id, points, workouts_completed) VALUES (?, 0, 0)").run(user.id);
      return { points: 0, workouts_completed: 0, rank: null };
    }
    const rank = db.query(
      "SELECT COUNT(*) + 1 as rank FROM user_points WHERE points > ?"
    ).get(row.points) as any;
    return { ...row, rank: rank.rank };
  });

export const getAllCountries = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      "SELECT DISTINCT country FROM users WHERE country != '' ORDER BY country"
    ).all() as any[];
    return rows.map((r: any) => r.country);
  });
