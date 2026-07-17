import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { seedFoods } from "~/lib/food-seed";

// Ensure foods table is seeded
function ensureSeeded() {
  seedFoods();
}

export const searchFoods = createServerFn()
  .handler(async ({ data }: { data: { query: string; category?: string } }) => {
    ensureSeeded();
    const db = getDb();
    const { query, category } = data;
    const q = `%${query}%`;
    if (category && category !== "all") {
      return db.query("SELECT * FROM foods WHERE name LIKE ? AND category = ? ORDER BY name LIMIT 30").all(q, category);
    }
    return db.query("SELECT * FROM foods WHERE name LIKE ? ORDER BY name LIMIT 30").all(q);
  });

export const getFoodsByCategory = createServerFn()
  .handler(async ({ data }: { data: { category: string } }) => {
    ensureSeeded();
    const db = getDb();
    if (data.category === "all") {
      return db.query("SELECT * FROM foods ORDER BY name").all();
    }
    return db.query("SELECT * FROM foods WHERE category = ? ORDER BY name").all(data.category);
  });

export const getFoodById = createServerFn()
  .handler(async ({ data }: { data: { id: number } }) => {
    ensureSeeded();
    const db = getDb();
    return db.query("SELECT * FROM foods WHERE id = ?").get(data.id);
  });

// Food Log
export const getFoodLogsForDate = createServerFn()
  .handler(async ({ data }: { data: { userId: number; date: string } }) => {
    ensureSeeded();
    const db = getDb();
    const logs = db.query(
      `SELECT fl.*, f.name as food_name, f.category as food_category
       FROM food_logs fl
       LEFT JOIN foods f ON fl.food_id = f.id
       WHERE fl.user_id = ? AND fl.log_date = ?
       ORDER BY fl.meal_type, fl.created_at`
    ).all(data.userId, data.date) as any[];
    return logs;
  });

export const addFoodLog = createServerFn()
  .handler(async ({ data }: { data: {
    userId: number;
    foodId?: number | null;
    customName?: string;
    mealType: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    logDate: string;
  } }) => {
    const db = getDb();
    const result = db.run(
      `INSERT INTO food_logs (user_id, food_id, custom_name, meal_type, servings, calories, protein, carbs, fat, log_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.userId, data.foodId || null, data.customName || "", data.mealType, data.servings,
       data.calories, data.protein, data.carbs, data.fat, data.logDate]
    );
    return { id: result.lastInsertRowid };
  });

export const deleteFoodLog = createServerFn()
  .handler(async ({ data }: { data: { logId: number; userId: number } }) => {
    const db = getDb();
    db.run("DELETE FROM food_logs WHERE id = ? AND user_id = ?", [data.logId, data.userId]);
    return { success: true };
  });

export const getDailyTotals = createServerFn()
  .handler(async ({ data }: { data: { userId: number; date: string } }) => {
    const db = getDb();
    const result = db.query(
      `SELECT
         COALESCE(SUM(calories * servings), 0) as total_calories,
         COALESCE(SUM(protein * servings), 0) as total_protein,
         COALESCE(SUM(carbs * servings), 0) as total_carbs,
         COALESCE(SUM(fat * servings), 0) as total_fat
       FROM food_logs
       WHERE user_id = ? AND log_date = ?`
    ).get(data.userId, data.date) as any;
    return {
      calories: Math.round(result.total_calories || 0),
      protein: Math.round(result.total_protein || 0),
      carbs: Math.round(result.total_carbs || 0),
      fat: Math.round(result.total_fat || 0),
    };
  });

// Meal Plans
export const getMealPlans = createServerFn()
  .handler(async ({ data }: { data: { userId: number } }) => {
    const db = getDb();
    return db.query("SELECT * FROM meal_plans WHERE user_id = ? ORDER BY created_at DESC").all(data.userId);
  });

export const getMealPlan = createServerFn()
  .handler(async ({ data }: { data: { planId: number } }) => {
    const db = getDb();
    const plan = db.query("SELECT * FROM meal_plans WHERE id = ?").get(data.planId) as any;
    if (!plan) return null;
    const entries = db.query(
      `SELECT mpe.*, f.name as food_name, f.category as food_category
       FROM meal_plan_entries mpe
       LEFT JOIN foods f ON mpe.food_id = f.id
       WHERE mpe.meal_plan_id = ?
       ORDER BY mpe.day_of_week, mpe.meal_type`
    ).all(data.planId) as any[];
    return { ...plan, entries };
  });

export const createMealPlan = createServerFn()
  .handler(async ({ data }: { data: {
    userId: number;
    name: string;
    startDate: string;
    endDate: string;
  } }) => {
    const db = getDb();
    const result = db.run(
      "INSERT INTO meal_plans (user_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
      [data.userId, data.name, data.startDate, data.endDate]
    );
    return { id: result.lastInsertRowid };
  });

export const addMealPlanEntry = createServerFn()
  .handler(async ({ data }: { data: {
    mealPlanId: number;
    dayOfWeek: number;
    mealType: string;
    foodId?: number | null;
    customName?: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } }) => {
    const db = getDb();
    const result = db.run(
      `INSERT INTO meal_plan_entries (meal_plan_id, day_of_week, meal_type, food_id, custom_name, servings, calories, protein, carbs, fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.mealPlanId, data.dayOfWeek, data.mealType, data.foodId || null, data.customName || "",
       data.servings, data.calories, data.protein, data.carbs, data.fat]
    );
    return { id: result.lastInsertRowid };
  });

export const deleteMealPlanEntry = createServerFn()
  .handler(async ({ data }: { data: { entryId: number; mealPlanId: number } }) => {
    const db = getDb();
    db.run("DELETE FROM meal_plan_entries WHERE id = ? AND meal_plan_id = ?", [data.entryId, data.mealPlanId]);
    return { success: true };
  });

export const deleteMealPlan = createServerFn()
  .handler(async ({ data }: { data: { planId: number; userId: number } }) => {
    const db = getDb();
    db.run("DELETE FROM meal_plans WHERE id = ? AND user_id = ?", [data.planId, data.userId]);
    return { success: true };
  });

export const getMealPlanDayTotals = createServerFn()
  .handler(async ({ data }: { data: { planId: number; dayOfWeek: number } }) => {
    const db = getDb();
    const result = db.query(
      `SELECT
         COALESCE(SUM(calories * servings), 0) as total_calories,
         COALESCE(SUM(protein * servings), 0) as total_protein,
         COALESCE(SUM(carbs * servings), 0) as total_carbs,
         COALESCE(SUM(fat * servings), 0) as total_fat
       FROM meal_plan_entries
       WHERE meal_plan_id = ? AND day_of_week = ?`
    ).get(data.planId, data.dayOfWeek) as any;
    return {
      calories: Math.round(result.total_calories || 0),
      protein: Math.round(result.total_protein || 0),
      carbs: Math.round(result.total_carbs || 0),
      fat: Math.round(result.total_fat || 0),
    };
  });
