import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getCurrentUser } from "~/lib/user-actions";

export interface PlanExercise {
  exercise_key: string;
  exercise_name: string;
  phase: "warmup" | "main" | "stretching";
  day_of_week: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  sort_order: number;
}

export interface CreatePlanData {
  name: string;
  goal: "weight_loss" | "muscle_gain" | "cardio" | "strength" | "general";
  days_per_week: number;
  exercises: PlanExercise[];
}

export const createWorkoutPlan = createServerFn()
  .validator((data: CreatePlanData) => {
    if (!data.name || !data.goal) throw new Error("Name and goal are required");
    if (!data.exercises || data.exercises.length === 0) throw new Error("At least one exercise is required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();

    const result = db.query(
      "INSERT INTO workout_plans (user_id, name, goal) VALUES (?, ?, ?)"
    ).run(user.id, data.name, data.goal);

    const planId = Number(result.lastInsertRowid);

    for (const ex of data.exercises) {
      db.query(
        `INSERT INTO plan_exercises (plan_id, exercise_key, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        planId,
        ex.exercise_key,
        ex.exercise_name,
        ex.phase,
        ex.day_of_week,
        ex.sets,
        ex.reps,
        ex.rest_seconds,
        ex.notes || "",
        ex.sort_order
      );
    }

    return { id: planId, name: data.name };
  });

export const getWorkoutPlans = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const plans = db.query(
      "SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC"
    ).all(user.id);

    // Get exercise count for each plan
    return (plans as any[]).map((p) => {
      const exCount = db.query(
        "SELECT COUNT(*) as count FROM plan_exercises WHERE plan_id = ?"
      ).get(p.id) as { count: number };
      return { ...p, exercise_count: exCount.count };
    });
  });

export const getWorkoutPlan = createServerFn()
  .validator((data: { id: number }) => {
    if (!data.id) throw new Error("Plan ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();

    const plan = db.query(
      "SELECT * FROM workout_plans WHERE id = ? AND user_id = ?"
    ).get(data.id, user.id) as any;

    if (!plan) throw new Error("Plan not found");

    const exercises = db.query(
      "SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY day_of_week, phase, sort_order"
    ).all(data.id) as any[];

    // Get progress for today
    const today = new Date().toISOString().split("T")[0];
    const progress = db.query(
      `SELECT pp.* FROM plan_progress pp
       JOIN plan_exercises pe ON pp.plan_exercise_id = pe.id
       WHERE pp.plan_id = ? AND date(pp.created_at) = ?`
    ).all(data.id, today) as any[];

    const progressMap = new Map<number, boolean>();
    for (const p of progress) {
      if (p.completed) progressMap.set(p.plan_exercise_id, true);
    }

    // Group exercises by day and phase
    const days: Record<number, { warmup: any[]; main: any[]; stretching: any[] }> = {};
    for (let d = 1; d <= 7; d++) {
      days[d] = { warmup: [], main: [], stretching: [] };
    }

    for (const ex of exercises) {
      const day = ex.day_of_week;
      if (!days[day]) days[day] = { warmup: [], main: [], stretching: [] };
      days[day][ex.phase as "warmup" | "main" | "stretching"].push({
        ...ex,
        completed: progressMap.get(ex.id) || false,
      });
    }

    return { plan, days };
  });

export const markExerciseDone = createServerFn()
  .validator((data: { planId: number; exerciseId: number; completed: boolean }) => {
    if (!data.planId || !data.exerciseId) throw new Error("Plan ID and exercise ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();

    // Verify plan belongs to user
    const plan = db.query("SELECT id FROM workout_plans WHERE id = ? AND user_id = ?").get(data.planId, user.id);
    if (!plan) throw new Error("Plan not found");

    const today = new Date().toISOString().split("T")[0];

    // Check if progress entry exists for today
    const existing = db.query(
      "SELECT id FROM plan_progress WHERE plan_id = ? AND plan_exercise_id = ? AND date(created_at) = ?"
    ).get(data.planId, data.exerciseId, today) as any;

    if (existing) {
      db.query(
        "UPDATE plan_progress SET completed = ?, completed_at = ? WHERE id = ?"
      ).run(data.completed ? 1 : 0, data.completed ? new Date().toISOString() : null, existing.id);
    } else {
      db.query(
        "INSERT INTO plan_progress (plan_id, plan_exercise_id, completed, completed_at) VALUES (?, ?, ?, ?)"
      ).run(data.planId, data.exerciseId, data.completed ? 1 : 0, data.completed ? new Date().toISOString() : null);
    }

    return { success: true };
  });

export const deleteWorkoutPlan = createServerFn()
  .validator((data: { id: number }) => {
    if (!data.id) throw new Error("Plan ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const plan = db.query("SELECT id FROM workout_plans WHERE id = ? AND user_id = ?").get(data.id, user.id);
    if (!plan) throw new Error("Plan not found");

    db.query("DELETE FROM plan_progress WHERE plan_id = ?").run(data.id);
    db.query("DELETE FROM plan_exercises WHERE plan_id = ?").run(data.id);
    db.query("DELETE FROM workout_plans WHERE id = ?").run(data.id);

    return { success: true };
  });

export const updateWorkoutPlan = createServerFn()
  .validator((data: { id: number; name?: string; goal?: string }) => {
    if (!data.id) throw new Error("Plan ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const plan = db.query("SELECT id FROM workout_plans WHERE id = ? AND user_id = ?").get(data.id, user.id);
    if (!plan) throw new Error("Plan not found");

    if (data.name) {
      db.query("UPDATE workout_plans SET name = ? WHERE id = ?").run(data.name, data.id);
    }
    if (data.goal) {
      db.query("UPDATE workout_plans SET goal = ? WHERE id = ?").run(data.goal, data.id);
    }

    return { success: true };
  });
