import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { hashPassword, verifyPassword, createSession } from "~/lib/auth";

export const loginUser = createServerFn()
  .validator((data: { email: string; password: string }) => {
    if (!data.email || !data.password) throw new Error("Email and password required");
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const user = db.query("SELECT id, email, password_hash, role, name, profile_picture FROM users WHERE email = ?").get(data.email) as {
      id: number;
      email: string;
      password_hash: string;
      role: string;
      name: string;
      profile_picture: string;
    } | undefined;

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const token = await createSession(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        profile_picture: user.profile_picture || "",
      },
    };
  });

export const registerUser = createServerFn()
  .validator((data: {
    email: string;
    password: string;
    name: string;
    role: "client" | "pt";
    country?: string;
    birthday?: string;
    refPtId?: number;
    // PT-specific fields
    certificationInfo?: string;
    yearsOfExperience?: number;
    educationLocation?: string;
    bio?: string;
  }) => {
    if (!data.email || !data.password || !data.name || !data.role) {
      throw new Error("Required fields: email, password, name, role");
    }
    if (data.role !== "client" && data.role !== "pt") {
      throw new Error("Role must be 'client' or 'pt'");
    }
    if (data.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const db = getDb();

    const existing = db.query("SELECT id FROM users WHERE email = ?").get(data.email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await hashPassword(data.password);

    const result = db.query(
      "INSERT INTO users (email, password_hash, role, name, country, birthday) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      data.email,
      passwordHash,
      data.role,
      data.name,
      data.country || "",
      data.birthday || ""
    );

    const userId = Number(result.lastInsertRowid);

    // If PT, create pt_profile
    if (data.role === "pt") {
      db.query(
        "INSERT INTO pt_profiles (user_id, certification_info, years_of_experience, education_location, bio) VALUES (?, ?, ?, ?, ?)"
      ).run(
        userId,
        data.certificationInfo || "",
        data.yearsOfExperience || 0,
        data.educationLocation || "",
        data.bio || ""
      );
    }

    // PT referral: auto-create premium trial subscription
    if (data.refPtId && data.role === "client") {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      db.query(
        "INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, 'premium', 'trial', ?, ?)"
      ).run(userId, now, expires);

      // Log activity
      db.query(
        "INSERT INTO activity_log (event_type, user_id, description, metadata) VALUES ('subscription', ?, ?, ?)"
      ).run(
        userId,
        "Premium trial activated via PT referral",
        JSON.stringify({ ref_pt_id: data.refPtId, plan: "premium", status: "trial" })
      );
    }

    const token = await createSession(userId);

    return {
      token,
      user: {
        id: userId,
        email: data.email,
        role: data.role,
        name: data.name,
        profile_picture: "",
      },
    };
  });
