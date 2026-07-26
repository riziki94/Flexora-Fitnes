import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";

/**
 * Subscribe an email to the Flexora newsletter.
 * Uses createServerFn so it can be called from client components.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 */
export const subscribeNewsletter = createServerFn()
  .handler(async (opts: { email: string }) => {
    const email = opts.email.trim().toLowerCase();

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const db = getDb();

    try {
      db.query(
        "INSERT INTO newsletter_subscribers (email) VALUES (?)",
      ).run(email);
      return { ok: true };
    } catch (err: any) {
      // SQLite UNIQUE constraint — already subscribed
      if (err?.message?.includes("UNIQUE") || err?.code === "SQLITE_CONSTRAINT") {
        return { ok: false, error: "You're already subscribed!" };
      }
      throw err;
    }
  });
