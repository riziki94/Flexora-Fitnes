import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getCurrentUser } from "~/lib/user-actions";

export interface WorkoutPackage {
  id: number;
  name: string;
  description: string;
  goal: string;
  category: string;
  price_cents: number;
  stripe_payment_link: string;
  exercise_count: number;
  days_per_week: number;
  created_at: string;
}

export interface PackageExercise {
  id: number;
  package_id: number;
  exercise_name: string;
  phase: "warmup" | "main" | "stretching";
  day_of_week: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
  sort_order: number;
}

export interface PackagePurchase {
  id: number;
  user_id: number;
  package_id: number;
  plan_id: number | null;
  purchased_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
}

export const getWorkoutPackages = createServerFn()
  .handler(async () => {
    const db = getDb();
    const packages = db.query(
      "SELECT * FROM workout_packages ORDER BY id"
    ).all() as WorkoutPackage[];
    return packages;
  });

export const getWorkoutPackage = createServerFn()
  .validator((data: { id: number }) => {
    if (!data.id) throw new Error("Package ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const pkg = db.query(
      "SELECT * FROM workout_packages WHERE id = ?"
    ).get(data.id) as WorkoutPackage | undefined;
    if (!pkg) throw new Error("Package not found");

    const exercises = db.query(
      "SELECT * FROM workout_package_exercises WHERE package_id = ? ORDER BY day_of_week, phase, sort_order"
    ).all(data.id) as PackageExercise[];

    // Group by day and phase
    const days: Record<number, { warmup: any[]; main: any[]; stretching: any[] }> = {};
    for (let d = 1; d <= 7; d++) {
      days[d] = { warmup: [], main: [], stretching: [] };
    }
    for (const ex of exercises) {
      const day = ex.day_of_week;
      if (!days[day]) days[day] = { warmup: [], main: [], stretching: [] };
      days[day][ex.phase].push(ex);
    }

    return { pkg, days };
  });

export const purchasePackage = createServerFn()
  .validator((data: { packageId: number }) => {
    if (!data.packageId) throw new Error("Package ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const pkg = db.query(
      "SELECT * FROM workout_packages WHERE id = ?"
    ).get(data.packageId) as WorkoutPackage | undefined;
    if (!pkg) throw new Error("Package not found");

    // Check if user already has an active purchase for this package
    const existing = db.query(
      "SELECT * FROM package_purchases WHERE user_id = ? AND package_id = ? AND status = 'active' ORDER BY purchased_at DESC LIMIT 1"
    ).get(user.id, data.packageId) as PackagePurchase | undefined;

    if (existing) {
      // Check if still valid
      const now = new Date().toISOString();
      if (existing.expires_at > now) {
        return { success: true, planId: existing.plan_id, alreadyPurchased: true };
      } else {
        // Expired — mark as expired
        db.query("UPDATE package_purchases SET status = 'expired' WHERE id = ?").run(existing.id);
      }
    }

    // Copy template exercises to a real workout plan for the user
    const pkgExercises = db.query(
      "SELECT * FROM workout_package_exercises WHERE package_id = ? ORDER BY day_of_week, phase, sort_order"
    ).all(data.packageId) as PackageExercise[];

    // Create the workout plan
    const planResult = db.query(
      "INSERT INTO workout_plans (user_id, name, goal) VALUES (?, ?, ?)"
    ).run(user.id, pkg.name, pkg.goal);
    const planId = Number(planResult.lastInsertRowid);

    // Copy exercises
    for (const ex of pkgExercises) {
      db.query(
        `INSERT INTO plan_exercises (plan_id, exercise_key, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        planId,
        ex.exercise_name.toLowerCase().replace(/\s+/g, "_"),
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

    // Calculate expiry: 24 hours from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Record purchase
    db.query(
      "INSERT INTO package_purchases (user_id, package_id, plan_id, purchased_at, expires_at, status) VALUES (?, ?, ?, ?, ?, 'active')"
    ).run(user.id, data.packageId, planId, now.toISOString(), expiresAt);

    return { success: true, planId, expiresAt };
  });

export const getPackagePurchaseStatus = createServerFn()
  .validator((data: { packageId: number }) => {
    if (!data.packageId) throw new Error("Package ID required");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const purchase = db.query(
      "SELECT * FROM package_purchases WHERE user_id = ? AND package_id = ? AND status = 'active' ORDER BY purchased_at DESC LIMIT 1"
    ).get(user.id, data.packageId) as PackagePurchase | undefined;

    if (!purchase) return { purchased: false };

    const now = new Date().toISOString();
    if (purchase.expires_at <= now) {
      db.query("UPDATE package_purchases SET status = 'expired' WHERE id = ?").run(purchase.id);
      return { purchased: false };
    }

    return {
      purchased: true,
      planId: purchase.plan_id,
      expiresAt: purchase.expires_at,
      purchasedAt: purchase.purchased_at,
    };
  });

export const getUserPackagePurchases = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();
    const purchases = db.query(
      `SELECT pp.*, wp.name as package_name, wp.goal as package_goal
       FROM package_purchases pp
       JOIN workout_packages wp ON pp.package_id = wp.id
       WHERE pp.user_id = ?
       ORDER BY pp.purchased_at DESC`
    ).all(user.id) as any[];

    // Auto-expire
    const now = new Date().toISOString();
    for (const p of purchases) {
      if (p.status === "active" && p.expires_at <= now) {
        db.query("UPDATE package_purchases SET status = 'expired' WHERE id = ?").run(p.id);
        p.status = "expired";
      }
    }

    return purchases;
  });
