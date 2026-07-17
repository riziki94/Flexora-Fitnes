import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getCurrentUser } from "~/lib/user-actions";

export const startWorkoutSession = createServerFn()
  .validator((data: { planId: number }) => {
    if (!data.planId) throw new Error("Plan ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const plan = db.query("SELECT id FROM workout_plans WHERE id = ? AND user_id = ?")
      .get(data.planId, user.id) as any;
    if (!plan) throw new Error("Plan not found");

    const result = db.query(
      "INSERT INTO workout_sessions (user_id, plan_id, started_at) VALUES (?, ?, datetime('now'))"
    ).run(user.id, data.planId);

    return { sessionId: Number(result.lastInsertRowid) };
  });

export const logSessionExercise = createServerFn()
  .validator((data: {
    sessionId: number;
    planExerciseId: number | null;
    exerciseName: string;
    phase: string;
    setsCompleted: number;
    totalSets: number;
    reps: string;
    effortLevel: string;
    breathsPerMinute: number;
    sortOrder: number;
  }) => {
    if (!data.sessionId || !data.exerciseName) throw new Error("Session ID and exercise name required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    db.query(
      `INSERT INTO session_exercises
       (session_id, plan_exercise_id, exercise_name, phase, sets_completed, total_sets, reps, effort_level, breaths_per_minute, completed_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    ).run(
      data.sessionId,
      data.planExerciseId,
      data.exerciseName,
      data.phase,
      data.setsCompleted,
      data.totalSets,
      data.reps,
      data.effortLevel,
      data.breathsPerMinute,
      data.sortOrder
    );
    return { success: true };
  });

export const endWorkoutSession = createServerFn()
  .validator((data: { sessionId: number }) => {
    if (!data.sessionId) throw new Error("Session ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const session = db.query(
      "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?"
    ).get(data.sessionId, user.id) as any;
    if (!session) throw new Error("Session not found");

    const startedAt = new Date(session.started_at).getTime();
    const now = new Date().getTime();
    const durationSeconds = Math.round((now - startedAt) / 1000);

    // Estimate calories: ~7-10 cal/min for moderate workout
    const caloriesEstimated = Math.round((durationSeconds / 60) * 8);

    db.query(
      "UPDATE workout_sessions SET ended_at = datetime('now'), duration_seconds = ?, calories_estimated = ? WHERE id = ?"
    ).run(durationSeconds, caloriesEstimated, data.sessionId);

    return { success: true, durationSeconds, caloriesEstimated };
  });

export const getSessionSummary = createServerFn()
  .validator((data: { sessionId: number }) => {
    if (!data.sessionId) throw new Error("Session ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const session = db.query(
      "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?"
    ).get(data.sessionId, user.id) as any;
    if (!session) throw new Error("Session not found");

    const exercises = db.query(
      "SELECT * FROM session_exercises WHERE session_id = ? ORDER BY sort_order"
    ).all(data.sessionId) as any[];

    const plan = db.query("SELECT name, goal FROM workout_plans WHERE id = ?").get(session.plan_id) as any;

    return {
      session: { ...session, started_at: String(session.started_at), ended_at: session.ended_at ? String(session.ended_at) : null },
      exercises: exercises.map((e: any) => ({ ...e, completed_at: e.completed_at ? String(e.completed_at) : "" })),
      plan: plan || { name: "Unknown Plan", goal: "general" },
    };
  });

export const getSessionHistory = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const sessions = db.query(
      `SELECT ws.*, wp.name as plan_name, wp.goal as plan_goal,
        (SELECT COUNT(*) FROM session_exercises WHERE session_id = ws.id) as exercise_count
       FROM workout_sessions ws
       JOIN workout_plans wp ON ws.plan_id = wp.id
       WHERE ws.user_id = ?
       ORDER BY ws.started_at DESC
       LIMIT 50`
    ).all(user.id) as any[];

    return sessions.map((s: any) => ({
      ...s,
      started_at: String(s.started_at),
      ended_at: s.ended_at ? String(s.ended_at) : null,
    }));
  });
