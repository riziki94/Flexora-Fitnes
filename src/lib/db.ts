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

    -- Workout packages (pre-made plans for sale)
    CREATE TABLE IF NOT EXISTS workout_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL CHECK(goal IN ('weight_loss','muscle_gain','cardio','strength','general')),
      category TEXT NOT NULL DEFAULT 'general',
      price_cents INTEGER NOT NULL DEFAULT 399,
      stripe_payment_link TEXT NOT NULL DEFAULT '',
      exercise_count INTEGER NOT NULL DEFAULT 0,
      days_per_week INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Package exercises (pre-seeded with packages)
    CREATE TABLE IF NOT EXISTS workout_package_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL REFERENCES workout_packages(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      phase TEXT NOT NULL CHECK(phase IN ('warmup','main','stretching')),
      day_of_week INTEGER NOT NULL DEFAULT 1 CHECK(day_of_week BETWEEN 1 AND 7),
      sets INTEGER NOT NULL DEFAULT 3,
      reps TEXT NOT NULL DEFAULT '10',
      rest_seconds INTEGER NOT NULL DEFAULT 60,
      notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- Package purchases (track user access)
    CREATE TABLE IF NOT EXISTS package_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id INTEGER NOT NULL REFERENCES workout_packages(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES workout_plans(id) ON DELETE SET NULL,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','cancelled'))
    );

    CREATE INDEX IF NOT EXISTS idx_package_purchases_user ON package_purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_package_purchases_status ON package_purchases(status);
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

  // Seed workout packages (idempotent)
  try {
    const pkgCount = (db.query("SELECT COUNT(*) as cnt FROM workout_packages").get() as any)?.cnt || 0;
    if (pkgCount === 0) {
      // Package payment link placeholder — replace with real Stripe link
      const STRIPE_PKG_LINK = "https://buy.stripe.com/package_399";

      // 1. Muskelbygging (Muscle Building) — 4-day split, 25+ exercises
      db.query(`INSERT INTO workout_packages (name, description, goal, category, price_cents, stripe_payment_link, exercise_count, days_per_week)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        "Muskelbygging",
        "4-dagers splittprogram for maksimal muskelvekst. Fokuserer på progressive overload og isolasjonsøvelser for hver muskelgruppe. Perfekt for intermediate/avanserte utøvere.",
        "muscle_gain", "muscle", 399, STRIPE_PKG_LINK, 28, 4
      );

      // 2. Vekttap (Weight Loss) — 3-day HIIT/cardio, 20+ exercises
      db.query(`INSERT INTO workout_packages (name, description, goal, category, price_cents, stripe_payment_link, exercise_count, days_per_week)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        "Vekttap",
        "3-dagers HIIT- og kondisjonsprogram for rask fettforbrenning. Kombinerer intervalltrening, kroppsvektøvelser og kondisjon for maksimal kaloriforbrenning.",
        "weight_loss", "weight_loss", 399, STRIPE_PKG_LINK, 22, 3
      );

      // 3. Styrke (Strength) — 3-day powerlifting style, 15+ exercises
      db.query(`INSERT INTO workout_packages (name, description, goal, category, price_cents, stripe_payment_link, exercise_count, days_per_week)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        "Styrke",
        "3-dagers styrkeprogram i powerlifting-stil. Fokuserer på knebøy, benkpress og markløft med progressive vektøkninger. Bygg rå styrke med lav-rep, tung belastning.",
        "strength", "strength", 399, STRIPE_PKG_LINK, 18, 3
      );

      // 4. Helkropp (Full Body) — 3-day full body, 18+ exercises
      db.query(`INSERT INTO workout_packages (name, description, goal, category, price_cents, stripe_payment_link, exercise_count, days_per_week)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        "Helkropp",
        "3-dagers helkroppsprogram for generell fitness. Dekker alle muskelgrupper hver økt med balanserte compound-øvelser. Perfekt for nybegynnere og travle personer.",
        "general", "general", 399, STRIPE_PKG_LINK, 21, 3
      );

      // --- Seed exercises for Muskelbygging (pkg_id=1) ---
      const muscleExercises = [
        // Day 1: Chest & Triceps
        ["Arm Circles", "warmup", 1, 2, "30 sec", 30, "Sirkelbevegelser med armene", 1],
        ["Jumping Jacks", "warmup", 1, 2, "45 sec", 30, "Hoppende jekker for å få opp pulsen", 2],
        ["Bench Press", "main", 1, 4, "8-10", 90, "Flat benk med vektstang", 3],
        ["Incline Dumbbell Press", "main", 1, 3, "10-12", 75, "Skråbenk med manualer", 4],
        ["Cable Flyes", "main", 1, 3, "12-15", 60, "Kabelkryss for bryst", 5],
        ["Dips", "main", 1, 3, "8-12", 90, "Dips for nedre bryst og triceps", 6],
        ["Tricep Pushdowns", "main", 1, 3, "12-15", 60, "Kabel pushdowns", 7],
        ["Overhead Tricep Extension", "main", 1, 3, "10-12", 60, "Manual over hodet", 8],
        ["Chest Stretch", "stretching", 1, 1, "30 sec", 0, "Strekk bryst mot dørkarm", 9],
        // Day 2: Back & Biceps
        ["Lat Pulldown Warmup", "warmup", 2, 2, "15", 45, "Lett nedtrekk for oppvarming", 1],
        ["Band Pull-Aparts", "warmup", 2, 2, "15", 30, "Strikk-øvelse for skuldre", 2],
        ["Deadlifts", "main", 2, 4, "6-8", 120, "Knebøy til markløft", 3],
        ["Barbell Rows", "main", 2, 3, "8-10", 90, "Roing med vektstang", 4],
        ["Lat Pulldowns", "main", 2, 3, "10-12", 75, "Nedtrekk bredt grep", 5],
        ["Seated Cable Rows", "main", 2, 3, "10-12", 60, "Sittende kabelroing", 6],
        ["Barbell Curls", "main", 2, 3, "8-12", 60, "Bicepscurl med stang", 7],
        ["Hammer Curls", "main", 2, 3, "10-12", 60, "Hammercurl med manualer", 8],
        ["Lat Stretch", "stretching", 2, 1, "30 sec", 0, "Strekk latissimus", 9],
        // Day 3: Legs & Shoulders
        ["Leg Swings", "warmup", 3, 2, "30 sec", 30, "Bensving foran/bak", 1],
        ["Bodyweight Squats", "warmup", 3, 2, "15", 30, "Knebøy med kroppsvekt", 2],
        ["Barbell Squats", "main", 3, 4, "8-10", 120, "Knebøy med vektstang", 3],
        ["Leg Press", "main", 3, 3, "10-12", 90, "Beinpress i maskin", 4],
        ["Romanian Deadlifts", "main", 3, 3, "10-12", 90, "Strake markløft", 5],
        ["Overhead Press", "main", 3, 4, "8-10", 90, "Skulderpress med stang", 6],
        ["Lateral Raises", "main", 3, 3, "12-15", 60, "Sidehev med manualer", 7],
        ["Quad Stretch", "stretching", 3, 1, "30 sec", 0, "Strekk fremside lår", 8],
        ["Hamstring Stretch", "stretching", 3, 1, "30 sec", 0, "Strekk bakside lår", 9],
        // Day 4: Arms & Abs
        ["Arm Swings", "warmup", 4, 2, "30 sec", 30, "Armsving foran/bak", 1],
        ["Plank", "warmup", 4, 2, "45 sec", 30, "Planke for core", 2],
        ["Close-Grip Bench Press", "main", 4, 3, "8-10", 90, "Smallt grep benkpress", 3],
        ["Skull Crushers", "main", 4, 3, "10-12", 60, "French press med stang", 4],
        ["Preacher Curls", "main", 4, 3, "10-12", 60, "Preachercurl", 5],
        ["Concentration Curls", "main", 4, 3, "12-15", 45, "Konsentrasjonscurl", 6],
        ["Hanging Leg Raises", "main", 4, 3, "15-20", 60, "Benhev i romersk stol", 7],
        ["Cable Crunches", "main", 4, 3, "15-20", 45, "Kabel-crunches", 8],
        ["Arm & Ab Stretch", "stretching", 4, 1, "30 sec", 0, "Strekk armer og mage", 9],
      ];

    for (const ex of muscleExercises) {
      db.query(`INSERT INTO workout_package_exercises (package_id, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ex[0], ex[1], ex[2], ex[3], ex[4], ex[5], ex[6], ex[7]);
    }

      // --- Seed exercises for Vekttap (pkg_id=2) ---
      const wlExercises = [
        // Day 1: HIIT Cardio
        ["Jumping Jacks", "warmup", 1, 1, "60 sec", 15, "Full kroppsoppvarming", 1],
        ["High Knees", "warmup", 1, 1, "45 sec", 15, "Høye knær på stedet", 2],
        ["Burpees", "main", 1, 3, "45 sec", 30, "Burpees med pushup", 3],
        ["Mountain Climbers", "main", 1, 3, "45 sec", 30, "Fjellklatrere", 4],
        ["Jump Squats", "main", 1, 3, "45 sec", 30, "Hoppende knebøy", 5],
        ["Kettlebell Swings", "main", 1, 3, "45 sec", 30, "Sving med kettlebell", 6],
        ["Box Jumps", "main", 1, 3, "30 sec", 45, "Hopp opp på boks", 7],
        ["Battle Ropes", "main", 1, 3, "30 sec", 30, "Tau-slamming", 8],
        ["Full Body Stretch", "stretching", 1, 1, "60 sec", 0, "Helkroppsstrekk", 9],
        // Day 2: Cardio & Core
        ["Jogging", "warmup", 2, 1, "5 min", 0, "Lett jogg på stedet/tredemølle", 1],
        ["Dynamic Stretching", "warmup", 2, 1, "3 min", 0, "Dynamiske tøyninger", 2],
        ["Treadmill Intervals", "main", 2, 1, "20 min", 0, "1 min sprint/2 min jogging, gjenta", 3],
        ["Plank", "main", 2, 3, "60 sec", 30, "Hold planke", 4],
        ["Russian Twists", "main", 2, 3, "20 reps", 30, "Russiske vridninger", 5],
        ["Bicycle Crunches", "main", 2, 3, "20 reps", 30, "Sykling-crunches", 6],
        ["Leg Raises", "main", 2, 3, "15", 30, "Benhev liggende", 7],
        ["Cool Down Walk", "stretching", 2, 1, "5 min", 0, "Rolig nedtrapping", 8],
        // Day 3: Full Body HIIT
        ["Arm Circles", "warmup", 3, 1, "60 sec", 15, "Armrotasjon", 1],
        ["Bodyweight Squats", "warmup", 3, 1, "20", 15, "Kroppsvekt knebøy", 2],
        ["Burpee to Tuck Jump", "main", 3, 3, "40 sec", 30, "Burpee med tuck hopp", 3],
        ["Dumbbell Thrusters", "main", 3, 3, "40 sec", 30, "Thrusters med manualer", 4],
        ["Skipping Rope", "main", 3, 3, "60 sec", 30, "Hoppetau", 5],
        ["Lunges", "main", 3, 3, "40 sec", 30, "Utfall vekselvis", 6],
        ["Push-Ups", "main", 3, 3, "40 sec", 30, "Armhevinger", 7],
        ["Cool Down & Stretch", "stretching", 3, 1, "5 min", 0, "Full nedtrapping og tøyning", 8],
      ];

    for (const ex of wlExercises) {
      db.query(`INSERT INTO workout_package_exercises (package_id, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
        VALUES (2, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ex[0], ex[1], ex[2], ex[3], ex[4], ex[5], ex[6], ex[7]);
    }

      // --- Seed exercises for Styrke (pkg_id=3) ---
      const strExercises = [
        // Day 1: Squat Focus
        ["Light Cardio", "warmup", 1, 1, "5 min", 0, "Lett sykkel/roing", 1],
        ["Dynamic Stretches", "warmup", 1, 1, "3 min", 0, "Bevegelighetsoppvarming", 2],
        ["Barbell Squats", "main", 1, 5, "5", 180, "Knebøy — hovedløft", 3],
        ["Pause Squats", "main", 1, 3, "3-5", 120, "Knebøy med pause i bunn", 4],
        ["Leg Press", "main", 1, 3, "6-8", 90, "Tung beinpress", 5],
        ["Walking Lunges", "main", 1, 3, "10 per leg", 60, "Gående utfall med manualer", 6],
        ["Calf Raises", "main", 1, 4, "12-15", 45, "Stående tåhev", 7],
        ["Hip Flexor Stretch", "stretching", 1, 1, "60 sec", 0, "Strekk hoftebøyere", 8],
        // Day 2: Bench Focus
        ["Band Pulls", "warmup", 2, 2, "15", 30, "Strikk for skuldre", 1],
        ["Push-Ups", "warmup", 2, 2, "10", 30, "Lett armheving", 2],
        ["Bench Press", "main", 2, 5, "5", 180, "Benkpress — hovedløft", 3],
        ["Incline Bench Press", "main", 2, 3, "5-8", 120, "Skråbenk", 4],
        ["Overhead Press", "main", 2, 4, "5-8", 120, "Skulderpress stående", 5],
        ["Dips (weighted)", "main", 2, 3, "6-8", 90, "Dips med vektbelte", 6],
        ["Tricep Extensions", "main", 2, 3, "8-10", 60, "Triceps extensions", 7],
        ["Shoulder Stretch", "stretching", 2, 1, "60 sec", 0, "Strekk skuldre/bryst", 8],
        // Day 3: Deadlift Focus
        ["Foam Rolling", "warmup", 3, 1, "5 min", 0, "Foam rolling rygg/ben", 1],
        ["Hip Circles", "warmup", 3, 1, "2 min", 0, "Hofte-sirkler", 2],
        ["Deadlifts", "main", 3, 5, "5", 180, "Markløft — hovedløft", 3],
        ["Deficit Deadlifts", "main", 3, 3, "3-5", 150, "Markløft fra underskudd", 4],
        ["Barbell Rows", "main", 3, 4, "6-8", 90, "Roing med vektstang", 5],
        ["Pull-Ups (weighted)", "main", 3, 3, "5-8", 90, "Pull-ups med vekt", 6],
        ["Barbell Curls", "main", 3, 3, "8-10", 60, "Bicepscurl tung", 7],
        ["Full Back Stretch", "stretching", 3, 1, "60 sec", 0, "Strekk rygg og bakside", 8],
      ];

    for (const ex of strExercises) {
      db.query(`INSERT INTO workout_package_exercises (package_id, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
        VALUES (3, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ex[0], ex[1], ex[2], ex[3], ex[4], ex[5], ex[6], ex[7]);
    }

      // --- Seed exercises for Helkropp (pkg_id=4) ---
      const fbExercises = [
        // Day 1: Full Body A
        ["Light Jogging", "warmup", 1, 1, "5 min", 0, "Lett jogging på stedet", 1],
        ["Arm & Leg Swings", "warmup", 1, 1, "2 min", 0, "Dynamisk oppvarming", 2],
        ["Goblet Squats", "main", 1, 3, "12-15", 60, "Knebøy med kettlebell/manual", 3],
        ["Push-Ups", "main", 1, 3, "12-15", 60, "Armhevinger", 4],
        ["Dumbbell Rows", "main", 1, 3, "12 per arm", 60, "Enarms roing", 5],
        ["Dumbbell Shoulder Press", "main", 1, 3, "10-12", 60, "Skulderpress med manualer", 6],
        ["Plank", "main", 1, 3, "45 sec", 30, "Plankehold", 7],
        ["Full Body Stretch", "stretching", 1, 1, "5 min", 0, "Helkropps tøyning", 8],
        // Day 2: Full Body B
        ["Jumping Jacks", "warmup", 2, 1, "3 min", 15, "Hoppende jekker", 1],
        ["Hip Circles", "warmup", 2, 1, "2 min", 0, "Hofte-rotasjoner", 2],
        ["Romanian Deadlifts", "main", 2, 3, "10-12", 75, "Strake markløft", 3],
        ["Lat Pulldowns", "main", 2, 3, "10-12", 75, "Nedtrekk", 4],
        ["Lunges", "main", 2, 3, "12 per leg", 60, "Utfall med manualer", 5],
        ["Lateral Raises", "main", 2, 3, "12-15", 45, "Sidehev", 6],
        ["Bicycle Crunches", "main", 2, 3, "20 per side", 30, "Sykling-crunches", 7],
        ["Stretch Routine", "stretching", 2, 1, "5 min", 0, "Tøyningsrutine", 8],
        // Day 3: Full Body C
        ["Dynamic Warmup", "warmup", 3, 1, "5 min", 0, "Dynamisk helkropp", 1],
        ["Bench Press", "main", 3, 3, "10-12", 75, "Benkpress med manualer", 2],
        ["Kettlebell Swings", "main", 3, 3, "15", 60, "Sving med kettlebell", 3],
        ["Pull-Ups / Assisted", "main", 3, 3, "8-10", 75, "Pull-ups eller assistanse", 4],
        ["Bulgarian Split Squats", "main", 3, 3, "10 per leg", 60, "Bulgarsk utfall", 5],
        ["Face Pulls", "main", 3, 3, "15", 45, "Face pulls for skuldre", 6],
        ["Hanging Knee Raises", "main", 3, 3, "15", 45, "Knehev hengende", 7],
        ["Cool Down & Stretch", "stretching", 3, 1, "5 min", 0, "Nedtrapping og tøyning", 8],
      ];

    for (const ex of fbExercises) {
      db.query(`INSERT INTO workout_package_exercises (package_id, exercise_name, phase, day_of_week, sets, reps, rest_seconds, notes, sort_order)
        VALUES (4, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ex[0], ex[1], ex[2], ex[3], ex[4], ex[5], ex[6], ex[7]);
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
