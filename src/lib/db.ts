// ⚠️ No Node.js module imports at top level — Vite client build can't resolve them.
// All platform-specific imports happen lazily inside getDb().

let db: any = null;

function getDataDir(): string {
  try {
    const base = (import.meta as any).dirname || "";
    return base + "/../../data";
  } catch {
    return "./data";
  }
}

export function getDb(): any {
  if (!db) {
    // Lazy-import bun:sqlite — only runs server-side
    const { Database } = require("bun:sqlite") as { Database: any };
    const { existsSync, mkdirSync } = require("node:fs") as {
      existsSync: (p: string) => boolean;
      mkdirSync: (p: string, opts?: any) => void;
    };

    const dataDir = getDataDir();
    const dbPath = dataDir + "/flexora.db";
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    runMigrations(db);
  }
  return db;
}

function runMigrations(db: any) {
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

    -- Speed date matches (created when both parties accept)
    CREATE TABLE IF NOT EXISTS speed_date_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pt_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot_id INTEGER REFERENCES speed_date_slots(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','pt_accepted','client_accepted','matched','declined')),
      chat_created INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_speed_date_matches_pt ON speed_date_matches(pt_user_id);
    CREATE INDEX IF NOT EXISTS idx_speed_date_matches_client ON speed_date_matches(client_user_id);
    CREATE INDEX IF NOT EXISTS idx_speed_date_matches_status ON speed_date_matches(status);

    -- Competitions & Leaderboard tables
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('reps','duration','consistency','weight_loss')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      prize TEXT NOT NULL DEFAULT '',
      country_scope TEXT NOT NULL DEFAULT 'global' CHECK(country_scope IN ('my_country','global')),
      max_participants INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','active','ended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(competition_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      workouts_completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL DEFAULT 'entry' CHECK(activity_type IN ('entry','join','score_update')),
      description TEXT NOT NULL DEFAULT '',
      score_delta INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
    CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
    CREATE INDEX IF NOT EXISTS idx_competition_participants_comp ON competition_participants(competition_id);
    CREATE INDEX IF NOT EXISTS idx_competition_participants_user ON competition_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_points_rank ON user_points(points DESC);
    CREATE INDEX IF NOT EXISTS idx_competition_activity_comp ON competition_activity(competition_id);

    CREATE TABLE IF NOT EXISTS pt_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pt_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER,
      rating TEXT NOT NULL CHECK(rating IN ('good','okay','bad')),
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pt_ratings_pt ON pt_ratings(pt_user_id);
    CREATE INDEX IF NOT EXISTS idx_pt_ratings_client ON pt_ratings(client_user_id);
    CREATE INDEX IF NOT EXISTS idx_pt_ratings_session ON pt_ratings(session_id);

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      week_start_date TEXT NOT NULL,
      time TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('workout','rest','cardio','stretching','meal_prep','pt_session','other')),
      name TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_entries_user ON schedule_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_entries_week ON schedule_entries(user_id, week_start_date);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(user_id, created_at);

    CREATE TABLE IF NOT EXISTS admin_users (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK(event_type IN ('signup','booking','payment','session_completed','subscription','pt_verified')),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      description TEXT NOT NULL DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

    -- WebRTC Signaling
    CREATE TABLE IF NOT EXISTS signaling_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES pt_bookings(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('offer', 'answer', 'ice', 'hangup')),
      data TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_signaling_booking ON signaling_messages(booking_id);
    CREATE INDEX IF NOT EXISTS idx_signaling_created ON signaling_messages(booking_id, created_at);

    -- Direct messages between users (PT <-> client)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

    -- Track when users were last active
    CREATE TABLE IF NOT EXISTS user_presence (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `);

    // Add new columns to existing tables if they don't exist (safe ALTER)
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN session_type TEXT NOT NULL DEFAULT '60min'"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN price REAL NOT NULL DEFAULT 0"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN cancellation_status TEXT NOT NULL DEFAULT 'none' CHECK(cancellation_status IN ('none','pt_cancelled','client_no_show','client_cancelled'))"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refunded_50','refunded_full'))"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN specialties TEXT NOT NULL DEFAULT ''"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN hourly_rate REAL NOT NULL DEFAULT 500"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN speed_date_enabled INTEGER NOT NULL DEFAULT 0"); } catch (_) { /* exists */ }
  try { db.exec("ALTER TABLE pt_profiles ADD COLUMN certificate_image TEXT NOT NULL DEFAULT ''"); } catch (_) { /* exists */ }

  // Seed first user as admin (idempotent)
  try {
    const firstUser = db.query("SELECT id FROM users ORDER BY id LIMIT 1").get() as any;
    if (firstUser) {
      db.query("INSERT OR IGNORE INTO admin_users (user_id) VALUES (?)").run(firstUser.id);
    }
  } catch (_) { /* best-effort */ }

  // Seed competition data (idempotent) — run inline to avoid circular imports
  try {
    const count = (db.query("SELECT COUNT(*) as cnt FROM competitions").get() as any)?.cnt || 0;
    if (count === 0) {
      const admin = db.query("SELECT id FROM users LIMIT 1").get() as any;
      const creatorId = admin ? admin.id : 1;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const in10days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const comps = [
        ["Summer Shred Challenge 2026", "Push your limits this summer! Compete for the most reps across all exercises. Winner gets bragging rights and a featured profile!", "reps", yesterday, in30days, "$200 Gift Card + 1 Year Premium Membership", "global", 100, "active"],
        ["Consistency King July", "Show up every day. The athlete with the most consecutive workout days wins. Miss a day and your streak resets!", "consistency", yesterday, in30days, "$100 Gift Card + Trophy Badge", "global", 0, "active"],
        ["Weekly Weight Loss Sprint", "A fast-paced weight loss challenge. Highest percentage of body weight lost in 2 weeks wins.", "weight_loss", in2days, in10days, "Premium Membership (6 months) + Nutrition Guide", "global", 50, "active"],
        ["Endurance Marathon", "Who can log the most workout minutes this month? Every session counts — cardio, strength, stretching.", "duration", in2days, in60days, "Gold Trophy Badge + Flexora Merch Pack", "global", 200, "upcoming"],
        ["Nordic Strength Showdown", "A country-exclusive competition for Nordic athletes. Compete with your fellow countrymen!", "reps", in2days, in30days, "Regional Champion Badge + Spa Weekend Voucher", "my_country", 50, "upcoming"],
        ["April Abs Challenge (Ended)", "This competition has concluded. Congratulations to all participants!", "consistency", "2026-04-01", "2026-04-30", "Premium Membership (3 months)", "global", 150, "ended"],
      ];

      for (const c of comps) {
        db.query(
          `INSERT INTO competitions (creator_id, name, description, type, start_date, end_date, prize, country_scope, max_participants, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).run(creatorId, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]);
      }

      // Seed user points
      const users = db.query("SELECT id FROM users LIMIT 20").all() as any[];
      for (let i = 0; i < users.length; i++) {
        const pts = Math.floor(Math.random() * 5000) + 500;
        const wko = Math.floor(pts / 50) + Math.floor(Math.random() * 20);
        db.query("INSERT OR IGNORE INTO user_points (user_id, points, workouts_completed) VALUES (?, ?, ?)").run(users[i].id, pts, wko);
      }

      // Seed participants for competition 1
      if (users.length > 0) {
        for (let i = 0; i < Math.min(users.length, 15); i++) {
          const score = Math.floor(Math.random() * 1000) + 100;
          db.query("INSERT OR IGNORE INTO competition_participants (competition_id, user_id, score) VALUES (1, ?, ?)").run(users[i].id, score);
          db.query("INSERT INTO competition_activity (competition_id, user_id, activity_type, description, score_delta) VALUES (1, ?, 'join', (SELECT name FROM users WHERE id = ?) || ' joined the competition', 0)").run(users[i].id, users[i].id);
        }
      }
    }
  } catch (_) { /* seed is best-effort */ }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
