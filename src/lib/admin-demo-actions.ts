import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { hashPassword, createSession } from "~/lib/auth";

const ADMIN_EMAIL = "admin@flexora.fitnes";
const ADMIN_NAME = "Flexora Admin";
const ADMIN_PASSWORD = "demo-admin-secure-2026";

export const activateAdminDemo = createServerFn().handler(async () => {
  const db = getDb();

  // ── 1. Create or get admin user ──────────────────────────
  let admin = db
    .query("SELECT id, email, role, name FROM users WHERE email = ?")
    .get(ADMIN_EMAIL) as
    | { id: number; email: string; role: string; name: string }
    | undefined;

  if (!admin) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const result = db
      .query(
        "INSERT INTO users (email, password_hash, role, name, country) VALUES (?, ?, 'client', ?, 'NO')"
      )
      .run(ADMIN_EMAIL, passwordHash, ADMIN_NAME);
    const userId = Number(result.lastInsertRowid);
    admin = { id: userId, email: ADMIN_EMAIL, role: "client", name: ADMIN_NAME };
  }

  // Ensure admin_users entry
  db.query("INSERT OR IGNORE INTO admin_users (user_id) VALUES (?)").run(admin.id);

  // Also make the admin a "pt" role so they can test PT features too
  // We'll add a pt_profile for them
  db.query("UPDATE users SET role = 'client' WHERE id = ?").run(admin.id);
  db.query(
    "INSERT OR IGNORE INTO pt_profiles (user_id, certification_info, years_of_experience, education_location, verification_status, bio, specialties, hourly_rate, speed_date_enabled) VALUES (?, ?, ?, ?, 'approved', ?, ?, ?, ?)"
  ).run(
    admin.id,
    "NASM Certified Personal Trainer, Precision Nutrition Level 1",
    5,
    "Norwegian School of Sport Sciences, Oslo",
    "Admin test PT profile — use this to test all PT features including bookings, speed dates, and video sessions.",
    "Strength Training,Weight Loss,Nutrition Coaching,HIIT",
    599,
    1
  );

  // ── 2. Create Hybrid subscription ────────────────────────
  const existingSub = db
    .query(
      "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND plan = 'hybrid'"
    )
    .get(admin.id) as any;
  if (!existingSub) {
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    db.query(
      "INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, 'hybrid', 'active', ?, ?)"
    ).run(admin.id, now.toISOString(), expires.toISOString());
  }

  // ── 3. Seed verified PTs ─────────────────────────────────
  const pts = [
    {
      name: "Anna Berg",
      email: "anna.berg@flexora.fitnes",
      country: "NO",
      bio: "Olympic-level strength coach with 10+ years of experience. Specializes in powerlifting and body recomposition.",
      cert: "NSCA-CSCS, ISSA Sports Nutrition",
      exp: 10,
      edu: "University of Oslo — Sports Science MSc",
      rate: 799,
      specialties: "Powerlifting,Body Recomposition,Sports Nutrition,Competition Prep",
    },
    {
      name: "Marcus Johansson",
      email: "marcus.j@flexora.fitnes",
      country: "SE",
      bio: "HIIT and functional training expert. Former military fitness instructor. Makes every session count!",
      cert: "ACE Certified, CrossFit Level 2",
      exp: 7,
      edu: "GIH Stockholm — Physical Education",
      rate: 649,
      specialties: "HIIT,Functional Training,Weight Loss,Military Fitness",
    },
    {
      name: "Sofia Larsen",
      email: "sofia.l@flexora.fitnes",
      country: "DK",
      bio: "Yoga & mobility specialist. 2000+ hours taught. Helps clients build strength through mindful movement.",
      cert: "RYT-500, Yoga Alliance, NASM-CES",
      exp: 8,
      edu: "University of Copenhagen — Physiotherapy BSc",
      rate: 699,
      specialties: "Yoga,Mobility,Rehabilitation,Posture Correction,Mindfulness",
    },
    {
      name: "Erik Hansen",
      email: "erik.h@flexora.fitnes",
      country: "NO",
      bio: "Endurance coach and marathon runner. Specializing in running programs and cardio conditioning.",
      cert: "UESCA Running Coach, NASM-CPT",
      exp: 6,
      edu: "NTNU Trondheim — Exercise Physiology",
      rate: 549,
      specialties: "Running,Endurance,Cardio,Marathon Training,Triathlon",
    },
    {
      name: "Lena Virtanen",
      email: "lena.v@flexora.fitnes",
      country: "FI",
      bio: "Pre/post-natal fitness specialist. Helping women stay strong through every stage of life.",
      cert: "AFPA Pre/Post Natal, NASM-CPT, Pilates Instructor",
      exp: 9,
      edu: "University of Helsinki — Physiotherapy MSc",
      rate: 749,
      specialties: "Pre/Post Natal,Pilates,Women's Health,Core Strength,Recovery",
    },
  ];

  const seededPtIds: number[] = [];

  for (const pt of pts) {
    let ptUser = db
      .query("SELECT id FROM users WHERE email = ?")
      .get(pt.email) as { id: number } | undefined;

    if (!ptUser) {
      const pwHash = await hashPassword("ptdemo2026");
      const result = db
        .query(
          "INSERT INTO users (email, password_hash, role, name, country) VALUES (?, ?, 'pt', ?, ?)"
        )
        .run(pt.email, pwHash, pt.name, pt.country);
      ptUser = { id: Number(result.lastInsertRowid) };
    }

    // Ensure pt_profile
    const existingProfile = db
      .query("SELECT user_id FROM pt_profiles WHERE user_id = ?")
      .get(ptUser.id) as any;
    if (!existingProfile) {
      db.query(
        "INSERT INTO pt_profiles (user_id, certification_info, years_of_experience, education_location, verification_status, bio, specialties, hourly_rate, speed_date_enabled) VALUES (?, ?, ?, ?, 'approved', ?, ?, ?, 1)"
      ).run(
        ptUser.id,
        pt.cert,
        pt.exp,
        pt.edu,
        pt.bio,
        pt.specialties,
        pt.rate
      );
    } else {
      // Ensure verified
      db.query(
        "UPDATE pt_profiles SET verification_status = 'approved' WHERE user_id = ?"
      ).run(ptUser.id);
    }

    // Ensure PT subscription
    const ptSub = db
      .query(
        "SELECT id FROM subscriptions WHERE user_id = ? AND plan = 'pt' AND status = 'active'"
      )
      .get(ptUser.id) as any;
    if (!ptSub) {
      const now = new Date();
      const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      db.query(
        "INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, 'pt', 'active', ?, ?)"
      ).run(ptUser.id, now.toISOString(), expires.toISOString());
    }

    // Seed user_points for leaderboard
    db.query("INSERT OR IGNORE INTO user_points (user_id, points, workouts_completed) VALUES (?, ?, ?)").run(
      ptUser.id,
      Math.floor(Math.random() * 3000) + 1000,
      Math.floor(Math.random() * 80) + 20
    );

    seededPtIds.push(ptUser.id);
  }

  // ── 4. Create workout plan for admin ─────────────────────
  const existingPlan = db
    .query("SELECT id FROM workout_plans WHERE user_id = ? AND name = 'Admin Demo Plan'")
    .get(admin.id) as { id: number } | undefined;

  let planId: number;

  if (existingPlan) {
    planId = existingPlan.id;
  } else {
    const planResult = db
      .query(
        "INSERT INTO workout_plans (user_id, name, goal) VALUES (?, ?, ?)"
      )
      .run(admin.id, "Admin Demo Plan", "general");
    planId = Number(planResult.lastInsertRowid);

    // Seed exercises for 3 days
    const exercises = [
      // Day 1 — Warmup
      { key: "jumping_jacks", name: "Jumping Jacks", phase: "warmup", day: 1, sets: 1, reps: "30", rest: 30, order: 1 },
      { key: "arm_circles", name: "Arm Circles", phase: "warmup", day: 1, sets: 1, reps: "20", rest: 15, order: 2 },
      // Day 1 — Main
      { key: "bench_press", name: "Bench Press", phase: "main", day: 1, sets: 4, reps: "8-10", rest: 90, order: 3 },
      { key: "bent_over_rows", name: "Bent Over Rows", phase: "main", day: 1, sets: 4, reps: "8-10", rest: 90, order: 4 },
      { key: "shoulder_press", name: "Shoulder Press", phase: "main", day: 1, sets: 3, reps: "10-12", rest: 60, order: 5 },
      { key: "bicep_curls", name: "Bicep Curls", phase: "main", day: 1, sets: 3, reps: "12-15", rest: 45, order: 6 },
      // Day 1 — Stretch
      { key: "chest_stretch", name: "Chest Stretch", phase: "stretching", day: 1, sets: 1, reps: "30s", rest: 0, order: 7 },

      // Day 2 — Warmup
      { key: "high_knees", name: "High Knees", phase: "warmup", day: 2, sets: 1, reps: "30", rest: 30, order: 1 },
      { key: "leg_swings", name: "Leg Swings", phase: "warmup", day: 2, sets: 1, reps: "20", rest: 15, order: 2 },
      // Day 2 — Main
      { key: "squats", name: "Barbell Squats", phase: "main", day: 2, sets: 4, reps: "8-10", rest: 90, order: 3 },
      { key: "deadlifts", name: "Deadlifts", phase: "main", day: 2, sets: 4, reps: "6-8", rest: 120, order: 4 },
      { key: "lunges", name: "Walking Lunges", phase: "main", day: 2, sets: 3, reps: "12/leg", rest: 60, order: 5 },
      { key: "calf_raises", name: "Calf Raises", phase: "main", day: 2, sets: 3, reps: "15-20", rest: 45, order: 6 },
      // Day 2 — Stretch
      { key: "hamstring_stretch", name: "Hamstring Stretch", phase: "stretching", day: 2, sets: 1, reps: "30s", rest: 0, order: 7 },

      // Day 3 — Warmup
      { key: "torso_twists", name: "Torso Twists", phase: "warmup", day: 3, sets: 1, reps: "20", rest: 30, order: 1 },
      // Day 3 — Main
      { key: "pull_ups", name: "Pull-Ups", phase: "main", day: 3, sets: 4, reps: "6-10", rest: 90, order: 2 },
      { key: "push_ups", name: "Push-Ups", phase: "main", day: 3, sets: 4, reps: "12-15", rest: 60, order: 3 },
      { key: "plank", name: "Plank Hold", phase: "main", day: 3, sets: 3, reps: "45s", rest: 30, order: 4 },
      { key: "russian_twists", name: "Russian Twists", phase: "main", day: 3, sets: 3, reps: "20/side", rest: 45, order: 5 },
      // Day 3 — Stretch
      { key: "cat_cow", name: "Cat-Cow Stretch", phase: "stretching", day: 3, sets: 1, reps: "10", rest: 0, order: 6 },
    ];

    for (const ex of exercises) {
      db.query(
        "INSERT INTO plan_exercises (plan_id, exercise_key, exercise_name, phase, day_of_week, sets, reps, rest_seconds, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(planId, ex.key, ex.name, ex.phase, ex.day, ex.sets, ex.reps, ex.rest, ex.order);
    }
  }

  // ── 5. Seed bookings ─────────────────────────────────────
  const existingBookings = db
    .query("SELECT COUNT(*) as cnt FROM pt_bookings WHERE client_id = ?")
    .get(admin.id) as { cnt: number };
  if (existingBookings.cnt === 0 && seededPtIds.length > 0) {
    const now = new Date();
    // Past completed booking
    const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    db.query(
      "INSERT INTO pt_bookings (client_id, pt_id, status, scheduled_at, session_type, price, payment_status) VALUES (?, ?, 'completed', ?, '60min', ?, 'paid')"
    ).run(admin.id, seededPtIds[0], pastDate.toISOString(), 599);

    // Upcoming confirmed booking
    const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    db.query(
      "INSERT INTO pt_bookings (client_id, pt_id, status, scheduled_at, session_type, price, payment_status) VALUES (?, ?, 'confirmed', ?, '30min', ?, 'paid')"
    ).run(admin.id, seededPtIds[0], futureDate.toISOString(), 349);

    // Another upcoming pending
    const futureDate2 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    db.query(
      "INSERT INTO pt_bookings (client_id, pt_id, status, scheduled_at, session_type, price, payment_status) VALUES (?, ?, 'pending', ?, '60min', ?, 'unpaid')"
    ).run(admin.id, seededPtIds[1], futureDate2.toISOString(), 649);

    // Seed a review for the completed booking
    db.query(
      "INSERT OR IGNORE INTO reviews (booking_id, client_id, pt_id, rating, comment) SELECT b.id, b.client_id, b.pt_id, 5, 'Great session! Very professional.' FROM pt_bookings b WHERE b.client_id = ? AND b.status = 'completed' LIMIT 1"
    ).run(admin.id);
  }

  // ── 6. Seed speed date slots ─────────────────────────────
  if (seededPtIds.length > 0) {
    const existingSlots = db
      .query("SELECT COUNT(*) as cnt FROM speed_date_slots WHERE pt_user_id = ?")
      .get(seededPtIds[0]) as { cnt: number };
    if (existingSlots.cnt === 0) {
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const slotDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        slotDate.setHours(10 + i, 0, 0, 0);
        db.query(
          "INSERT INTO speed_date_slots (pt_user_id, datetime, status) VALUES (?, ?, 'open')"
        ).run(seededPtIds[0], slotDate.toISOString());
      }
    }
  }

  // ── 7. Create session & return ───────────────────────────
  const token = await createSession(admin.id);

  return {
    token,
    user: {
      id: admin.id,
      email: ADMIN_EMAIL,
      role: "client",
      name: ADMIN_NAME,
    },
    demoUrl: "/app/admin/demo",
    dashboardUrl: "/app/dashboard",
    seeded: {
      pts: pts.length,
      planExercises: 20,
      bookings: 3,
      speedDateSlots: 5,
    },
  };
});
