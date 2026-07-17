import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { hashPassword, createSession } from "~/lib/auth";

const PT_DEMO_EMAIL = "anna.berg@flexora.fitnes";
const PT_DEMO_NAME = "Anna Berg";
const PT_DEMO_PASSWORD = "ptdemo2026";

export const activatePTDemo = createServerFn().handler(async () => {
  const db = getDb();

  // ── 1. Find or create Anna Berg ───────────────────────────
  let ptUser = db
    .query("SELECT id, email, role, name FROM users WHERE email = ?")
    .get(PT_DEMO_EMAIL) as
    | { id: number; email: string; role: string; name: string }
    | undefined;

  if (!ptUser) {
    const passwordHash = await hashPassword(PT_DEMO_PASSWORD);
    const result = db
      .query(
        "INSERT INTO users (email, password_hash, role, name, country) VALUES (?, ?, 'pt', ?, 'NO')"
      )
      .run(PT_DEMO_EMAIL, passwordHash, PT_DEMO_NAME);
    const userId = Number(result.lastInsertRowid);
    ptUser = { id: userId, email: PT_DEMO_EMAIL, role: "pt", name: PT_DEMO_NAME };
  }

  // Ensure role is "pt"
  db.query("UPDATE users SET role = 'pt' WHERE id = ?").run(ptUser.id);

  // ── 2. Ensure verified PT profile ─────────────────────────
  const existingProfile = db
    .query("SELECT user_id, verification_status, years_of_experience FROM pt_profiles WHERE user_id = ?")
    .get(ptUser.id) as any;

  if (!existingProfile) {
    db.query(
      "INSERT INTO pt_profiles (user_id, certification_info, years_of_experience, education_location, verification_status, bio, specialties, hourly_rate, speed_date_enabled) VALUES (?, ?, ?, ?, 'approved', ?, ?, ?, 1)"
    ).run(
      ptUser.id,
      "NSCA-CSCS, ISSA Sports Nutrition",
      10,
      "University of Oslo — Sports Science MSc",
      "Olympic-level strength coach with 10+ years of experience. Specializes in powerlifting and body recomposition.",
      "Powerlifting,Body Recomposition,Sports Nutrition,Competition Prep",
      799
    );
  } else {
    // Ensure verified and correct experience
    db.query(
      "UPDATE pt_profiles SET verification_status = 'approved', years_of_experience = 10 WHERE user_id = ?"
    ).run(ptUser.id);
  }

  // ── 3. Ensure active PT subscription ──────────────────────
  const existingSub = db
    .query(
      "SELECT id FROM subscriptions WHERE user_id = ? AND plan = 'pt' AND status = 'active'"
    )
    .get(ptUser.id) as any;
  if (!existingSub) {
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    db.query(
      "INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, 'pt', 'active', ?, ?)"
    ).run(ptUser.id, now.toISOString(), expires.toISOString());
  }

  // ── 4. Seed user_points for leaderboard ──────────────────
  db.query("INSERT OR IGNORE INTO user_points (user_id, points, workouts_completed) VALUES (?, ?, ?)").run(
    ptUser.id,
    3200,
    68
  );

  // ── 5. Get full profile data for display ──────────────────
  const profile = db
    .query("SELECT * FROM pt_profiles WHERE user_id = ?")
    .get(ptUser.id) as any;

  const sub = db
    .query("SELECT plan, status FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1")
    .get(ptUser.id) as any;

  // ── 6. Create session & return ────────────────────────────
  const token = await createSession(ptUser.id);

  return {
    token,
    user: {
      id: ptUser.id,
      email: PT_DEMO_EMAIL,
      role: "pt" as const,
      name: PT_DEMO_NAME,
    },
    demoUrl: "/app/pt/demo",
    dashboardUrl: "/app/dashboard",
    seeded: {
      name: PT_DEMO_NAME,
      experience: profile?.years_of_experience || 10,
      certification: profile?.certification_info || "NSCA-CSCS, ISSA Sports Nutrition",
      education: profile?.education_location || "University of Oslo — Sports Science MSc",
      specialties: profile?.specialties || "Powerlifting, Body Recomposition, Sports Nutrition, Competition Prep",
      hourlyRate: profile?.hourly_rate || 799,
      subscription: sub?.plan || "pt",
    },
  };
});
