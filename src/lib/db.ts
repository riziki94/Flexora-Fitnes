import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dirname, "..", "..", "data");
const DB_PATH = join(DATA_DIR, "flexora.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    runMigrations(db);
  }
  return db;
}

function runMigrations(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('client', 'pt')),
      name TEXT NOT NULL,
      country TEXT DEFAULT '',
      profile_picture TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pt_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      diploma_url TEXT DEFAULT '',
      certification_info TEXT DEFAULT '',
      years_of_experience INTEGER DEFAULT 0,
      education_location TEXT DEFAULT '',
      verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'approved', 'rejected')),
      bio TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL CHECK(plan IN ('basis', 'hybrid', 'premium', 'pt')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal TEXT NOT NULL CHECK(goal IN ('weight_loss', 'muscle_gain', 'cardio', 'strength', 'general')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pt_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id),
      pt_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      scheduled_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_pt_bookings_client ON pt_bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_pt_bookings_pt ON pt_bookings(pt_id);

    CREATE TABLE IF NOT EXISTS plan_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
      exercise_key TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      phase TEXT NOT NULL CHECK(phase IN ('warmup', 'main', 'stretching')),
      day_of_week INTEGER NOT NULL DEFAULT 1 CHECK(day_of_week BETWEEN 1 AND 7),
      sets INTEGER NOT NULL DEFAULT 3,
      reps TEXT NOT NULL DEFAULT '10',
      rest_seconds INTEGER NOT NULL DEFAULT 60,
      notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
      plan_exercise_id INTEGER NOT NULL REFERENCES plan_exercises(id) ON DELETE CASCADE,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan ON plan_exercises(plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_progress_plan ON plan_progress(plan_id);

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      serving_size TEXT NOT NULL DEFAULT '100g',
      category TEXT NOT NULL DEFAULT 'general'
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
      custom_name TEXT DEFAULT '',
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      servings REAL NOT NULL DEFAULT 1,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      log_date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL DEFAULT (date('now')),
      end_date TEXT NOT NULL DEFAULT (date('now', '+6 days')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_plan_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
      custom_name TEXT DEFAULT '',
      servings REAL NOT NULL DEFAULT 1,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
    CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);
    CREATE INDEX IF NOT EXISTS idx_food_logs_meal_type ON food_logs(meal_type);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_plan ON meal_plan_entries(meal_plan_id);

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      calories_estimated INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      plan_exercise_id INTEGER REFERENCES plan_exercises(id) ON DELETE SET NULL,
      exercise_name TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'main',
      sets_completed INTEGER NOT NULL DEFAULT 0,
      total_sets INTEGER NOT NULL DEFAULT 0,
      reps TEXT NOT NULL DEFAULT '',
      effort_level TEXT DEFAULT '' CHECK(effort_level IN ('', 'green', 'yellow', 'red')),
      breaths_per_minute REAL DEFAULT 0,
      completed_at TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan ON workout_sessions(plan_id);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);

    -- PT Booking & Speed Date tables

    CREATE TABLE IF NOT EXISTS pt_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pt_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS speed_date_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pt_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      datetime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'booked', 'completed', 'cancelled')),
      client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES pt_bookings(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pt_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pt_availability_pt ON pt_availability(pt_user_id);
    CREATE INDEX IF NOT EXISTS idx_speed_date_slots_pt ON speed_date_slots(pt_user_id);
    CREATE INDEX IF NOT EXISTS idx_speed_date_slots_status ON speed_date_slots(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_pt ON reviews(pt_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
  `);

  // Add new columns to existing tables if they don't exist (safe ALTER)
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN session_type TEXT NOT NULL DEFAULT '60min'"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN price REAL NOT NULL DEFAULT 0"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN cancellation_status TEXT NOT NULL DEFAULT 'none' CHECK(cancellation_status IN ('none','pt_cancelled','client_no_show','client_cancelled'))"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN specialties TEXT NOT NULL DEFAULT ''"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN hourly_rate REAL NOT NULL DEFAULT 500"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN speed_date_enabled INTEGER NOT NULL DEFAULT 0"); } catch (_) { /* exists */ }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
