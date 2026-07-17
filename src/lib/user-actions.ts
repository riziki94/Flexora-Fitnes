import { createServerFn } from "@tanstack/react-start";
import { getUserFromToken } from "~/lib/auth";
import { getDb } from "~/lib/db";

export const getCurrentUser = createServerFn()
  .handler(async () => {
    // Read token from the request
    const request = (globalThis as any).__request;
    if (!request) return null;

    const authHeader = request.headers.get("authorization") || request.headers.get("cookie");
    if (!authHeader) return null;

    let token: string | null = null;

    // Try Authorization header
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (authHeader.includes("flexora_token=")) {
      // Try cookie
      const match = authHeader.match(/flexora_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    const user = await getUserFromToken(token);
    if (!user) return null;

    const db = getDb();
    let ptProfile = null;
    if (user.role === "pt") {
      ptProfile = db.query("SELECT * FROM pt_profiles WHERE user_id = ?").get(user.id) as any;
    }

    return { ...user, ptProfile: ptProfile || undefined };
  });

export const getPtProfile = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "pt") throw new Error("Unauthorized");

    const db = getDb();
    return db.query("SELECT * FROM pt_profiles WHERE user_id = ?").get(user.id);
  });

export const getDashboardData = createServerFn()
  .handler(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const db = getDb();

    if (user.role === "pt") {
      const profile = db.query("SELECT * FROM pt_profiles WHERE user_id = ?").get(user.id);
      const bookings = db.query(
        "SELECT pb.*, u.name as client_name, u.email as client_email FROM pt_bookings pb JOIN users u ON pb.client_id = u.id WHERE pb.pt_id = ? ORDER BY pb.scheduled_at DESC LIMIT 10"
      ).all(user.id);
      return { user, profile, bookings };
    }

    const workouts = db.query(
      "SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10"
    ).all(user.id);

    const subscription = db.query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get(user.id);

    return { user, workouts, subscription };
  });

export const updateProfilePicture = createServerFn()
  .validator((data: { imageDataUrl: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    // Validate it's a reasonable base64 data URL (max ~400KB after base64 => ~512KB limit)
    if (!data.imageDataUrl || !data.imageDataUrl.startsWith("data:image/")) {
      throw new Error("Invalid image data");
    }
    if (data.imageDataUrl.length > 700_000) {
      throw new Error("Image too large — max 512KB");
    }

    const db = getDb();
    db.query("UPDATE users SET profile_picture = ? WHERE id = ?")
      .run(data.imageDataUrl, user.id);

    return { success: true };
  });
