import { createServerFn } from "@tanstack/react-start";
import { getUserFromToken } from "~/lib/auth";
import { getDb } from "~/lib/db";
import { PT_SESSION_PRICE, PT_REFUND_HOURS_THRESHOLD } from "~/lib/stripe";
import { getServerRequest } from "~/lib/request-context";

// --- Auth helper ---
async function getAuthUser() {
  const request = getServerRequest();
  if (!request) throw new Error("No request context");

  let token: string | null = null;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/flexora_token=([^;]+)/);
  if (match) token = match[1];

  if (!token) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  }

  if (!token) throw new Error("Unauthorized");
  const user = await getUserFromToken(token);
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ── PT Discovery ──────────────────────────────────────────

export const searchPTs = createServerFn()
  .validator((data: {
    country?: string;
    specialty?: string;
    minExperience?: number;
    search?: string;
  }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    let query = `
      SELECT u.id, u.name, u.country, u.profile_picture,
             p.years_of_experience, p.education_location, p.specialties,
             p.hourly_rate, p.verification_status, p.bio,
             p.speed_date_enabled, p.certificate_image,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(r.id) as review_count
      FROM users u
      JOIN pt_profiles p ON u.id = p.user_id
      LEFT JOIN reviews r ON r.pt_id = u.id
      WHERE u.role = 'pt' AND p.verification_status = 'approved'
        AND u.profile_picture IS NOT NULL AND u.profile_picture != ''
    `;
    const params: any[] = [];

    if (data.country) {
      query += ` AND u.country = ?`;
      params.push(data.country);
    }
    if (data.specialty) {
      query += ` AND p.specialties LIKE ?`;
      params.push(`%${data.specialty}%`);
    }
    if (data.minExperience) {
      query += ` AND p.years_of_experience >= ?`;
      params.push(data.minExperience);
    }
    if (data.search) {
      query += ` AND (u.name LIKE ? OR p.bio LIKE ? OR p.specialties LIKE ?)`;
      params.push(`%${data.search}%`, `%${data.search}%`, `%${data.search}%`);
    }

    query += ` GROUP BY u.id ORDER BY avg_rating DESC, review_count DESC LIMIT 50`;

    const pts = db.query(query).all(...params);
    return pts.map((pt: any) => ({
      ...pt,
      avg_rating: Number(pt.avg_rating || 0),
      specialties: pt.specialties ? pt.specialties.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    }));
  });

// ── PT Profile ────────────────────────────────────────────

export const getPtDetail = createServerFn()
  .validator((data: { ptId: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const pt = db.query(`
      SELECT u.id, u.name, u.country, u.profile_picture,
             p.years_of_experience, p.education_location, p.specialties,
             p.hourly_rate, p.verification_status, p.bio,
             p.diploma_url, p.certification_info, p.certificate_image,
             p.speed_date_enabled,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(r.id) as review_count
      FROM users u
      JOIN pt_profiles p ON u.id = p.user_id
      LEFT JOIN reviews r ON r.pt_id = u.id
      WHERE u.id = ? AND u.role = 'pt' AND p.verification_status = 'approved'
      GROUP BY u.id
    `).get(data.ptId) as any;

    if (!pt) throw new Error("PT not found");

    // Get availability
    const availability = db.query(
      "SELECT * FROM pt_availability WHERE pt_user_id = ? ORDER BY day_of_week, start_time"
    ).all(data.ptId);

    // Get recent reviews
    const reviews = db.query(`
      SELECT r.*, u.name as client_name
      FROM reviews r
      JOIN users u ON r.client_id = u.id
      WHERE r.pt_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(data.ptId);

    return {
      ...pt,
      avg_rating: Number(pt.avg_rating || 0),
      specialties: pt.specialties ? pt.specialties.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      availability: availability || [],
      reviews: reviews || [],
    };
  });

// ── PT Availability Management ────────────────────────────

export const saveAvailability = createServerFn()
  .validator((data: {
    slots: { day_of_week: number; start_time: string; end_time: string }[];
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs can set availability");

    const db = getDb();
    db.query("DELETE FROM pt_availability WHERE pt_user_id = ?").run(user.id);
    for (const slot of data.slots) {
      db.query(
        "INSERT INTO pt_availability (pt_user_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
      ).run(user.id, slot.day_of_week, slot.start_time, slot.end_time);
    }
    return { success: true };
  });

export const getMyAvailability = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs can view availability");

    const db = getDb();
    return db.query(
      "SELECT * FROM pt_availability WHERE pt_user_id = ? ORDER BY day_of_week, start_time"
    ).all(user.id);
  });

// ── Booking ───────────────────────────────────────────────

export const createBooking = createServerFn()
  .validator((data: {
    ptId: number;
    scheduledAt: string;
    sessionType: "30min" | "60min";
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "client") throw new Error("Only clients can book");

    const db = getDb();

    // Get PT's hourly rate
    const pt = db.query(
      "SELECT hourly_rate FROM pt_profiles WHERE user_id = ? AND verification_status = 'approved'"
    ).get(data.ptId) as any;
    if (!pt) throw new Error("PT not found or not verified");

    const hourlyRate = pt.hourly_rate || PT_SESSION_PRICE;
    const price = data.sessionType === "30min" ? hourlyRate / 2 : hourlyRate;

    const result = db.query(
      `INSERT INTO pt_bookings (client_id, pt_id, status, scheduled_at, session_type, price, payment_status)
       VALUES (?, ?, 'confirmed', ?, ?, ?, 'unpaid')`
    ).run(user.id, data.ptId, data.scheduledAt, data.sessionType, price);

    const bookingId = Number(result.lastInsertRowid);

    return {
      bookingId,
      price,
      sessionType: data.sessionType,
      scheduledAt: data.scheduledAt,
      ptName: "",
    };
  });

// ── Mark booking as paid (called after Stripe payment) ───

export const markBookingPaid = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query("SELECT * FROM pt_bookings WHERE id = ? AND client_id = ?")
      .get(data.bookingId, user.id) as any;
    if (!booking) throw new Error("Booking not found");

    db.query("UPDATE pt_bookings SET payment_status = 'paid' WHERE id = ?")
      .run(data.bookingId);

    return { success: true, bookingId: data.bookingId };
  });

// ── My Bookings ───────────────────────────────────────────

export const getMyBookings = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    const db = getDb();

    if (user.role === "pt") {
      const bookings = db.query(`
        SELECT pb.*, u.name as client_name, u.email as client_email, u.profile_picture as client_profile_picture
        FROM pt_bookings pb
        JOIN users u ON pb.client_id = u.id
        WHERE pb.pt_id = ?
        ORDER BY pb.scheduled_at DESC
      `).all(user.id);

      // Earnings summary
      const earnings = db.query(`
        SELECT
          COUNT(*) as total_sessions,
          SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_earnings,
          SUM(CASE WHEN status = 'confirmed' THEN price ELSE 0 END) as upcoming_earnings
        FROM pt_bookings
        WHERE pt_id = ? AND cancellation_status = 'none'
      `).get(user.id) as any;

      return {
        role: "pt",
        bookings: bookings || [],
        earnings: {
          total_sessions: earnings?.total_sessions || 0,
          total_earnings: earnings?.total_earnings || 0,
          upcoming_earnings: earnings?.upcoming_earnings || 0,
        },
      };
    }

    // Client view
    const bookings = db.query(`
      SELECT pb.*, u.name as pt_name, u.country as pt_country, u.profile_picture as pt_profile_picture
      FROM pt_bookings pb
      JOIN users u ON pb.pt_id = u.id
      WHERE pb.client_id = ?
      ORDER BY pb.scheduled_at DESC
    `).all(user.id);

    return {
      role: "client",
      bookings: bookings || [],
    };
  });

// ── Cancel booking (PT) ───────────────────────────────────

export const cancelBooking = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query("SELECT * FROM pt_bookings WHERE id = ?").get(data.bookingId) as any;
    if (!booking) throw new Error("Booking not found");

    // Only PT can cancel
    if (user.role !== "pt" || booking.pt_id !== user.id) {
      throw new Error("Only the PT can cancel this booking");
    }

    db.query(
      "UPDATE pt_bookings SET status = 'cancelled', cancellation_status = 'pt_cancelled' WHERE id = ?"
    ).run(data.bookingId);

    return { success: true };
  });

// ── Cancel booking (Client) — with refund logic ───────────

export const cancelBookingClient = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "client") throw new Error("Only clients can cancel their bookings");

    const db = getDb();
    const booking = db.query("SELECT * FROM pt_bookings WHERE id = ? AND client_id = ?")
      .get(data.bookingId, user.id) as any;
    if (!booking) throw new Error("Booking not found");

    if (booking.status === "cancelled") {
      throw new Error("Booking is already cancelled");
    }
    if (booking.status === "completed") {
      throw new Error("Cannot cancel a completed session");
    }

    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at + "Z"); // treat as UTC
    const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundStatus = "refunded_full";
    let refundMessage = "";

    if (hoursUntilSession > PT_REFUND_HOURS_THRESHOLD) {
      // > 2 hours: 50% refund
      refundStatus = "refunded_50";
      refundMessage = `Du får 50% refusjon (${Math.round(booking.price / 2)} kr)`;
    } else {
      // < 2 hours: no refund
      refundStatus = "refunded_full"; // means "charged full, no refund"
      refundMessage = "Ingen refusjon ved avbud mindre enn 2 timer før";
    }

    db.query(
      "UPDATE pt_bookings SET status = 'cancelled', cancellation_status = 'client_cancelled', payment_status = ? WHERE id = ?"
    ).run(refundStatus, data.bookingId);

    return {
      success: true,
      refundStatus,
      refundMessage,
      hoursUntilSession: Math.round(hoursUntilSession * 10) / 10,
    };
  });

// ── Mark no-show (PT) ─────────────────────────────────────

export const markNoShow = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query("SELECT * FROM pt_bookings WHERE id = ?").get(data.bookingId) as any;
    if (!booking) throw new Error("Booking not found");

    if (user.role !== "pt" || booking.pt_id !== user.id) {
      throw new Error("Only the PT can mark no-show");
    }

    db.query(
      "UPDATE pt_bookings SET status = 'completed', cancellation_status = 'client_no_show', payment_status = 'refunded_full' WHERE id = ?"
    ).run(data.bookingId);

    return { success: true, penaltyApplied: true };
  });

// ── Get refund info for a booking ─────────────────────────

export const getRefundInfo = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query("SELECT * FROM pt_bookings WHERE id = ? AND client_id = ?")
      .get(data.bookingId, user.id) as any;
    if (!booking) throw new Error("Booking not found");

    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at + "Z");
    const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundMessage: string;
    let refundPercent: number;

    if (hoursUntilSession > PT_REFUND_HOURS_THRESHOLD) {
      refundMessage = `Du får 50% refusjon (${Math.round(booking.price / 2)} kr)`;
      refundPercent = 50;
    } else {
      refundMessage = "Ingen refusjon ved avbud mindre enn 2 timer før";
      refundPercent = 0;
    }

    return {
      hoursUntilSession: Math.round(hoursUntilSession * 10) / 10,
      refundMessage,
      refundPercent,
      price: booking.price,
    };
  });

// ── Speed Date ────────────────────────────────────────────

export const toggleSpeedDate = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs can toggle speed date");

    const db = getDb();
    const profile = db.query(
      "SELECT speed_date_enabled FROM pt_profiles WHERE user_id = ?"
    ).get(user.id) as any;

    const newState = profile?.speed_date_enabled ? 0 : 1;
    db.query("UPDATE pt_profiles SET speed_date_enabled = ? WHERE user_id = ?").run(newState, user.id);

    return { speed_date_enabled: !!newState };
  });

export const getSpeedDateStatus = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs");

    const db = getDb();
    const profile = db.query(
      "SELECT speed_date_enabled FROM pt_profiles WHERE user_id = ?"
    ).get(user.id) as any;

    return { speed_date_enabled: !!profile?.speed_date_enabled };
  });

export const getSpeedDateSlots = createServerFn()
  .handler(async () => {
    const db = getDb();
    const slots = db.query(`
      SELECT sds.*, u.name as pt_name, u.country as pt_country,
             p.years_of_experience, p.specialties, p.hourly_rate
      FROM speed_date_slots sds
      JOIN users u ON sds.pt_user_id = u.id
      JOIN pt_profiles p ON u.id = p.user_id
      WHERE sds.status = 'open' AND sds.datetime > datetime('now')
        AND u.profile_picture IS NOT NULL AND u.profile_picture != ''
      ORDER BY sds.datetime ASC
      LIMIT 20
    `).all();

    return (slots || []).map((s: any) => ({
      ...s,
      specialties: s.specialties ? s.specialties.split(",").map((x: string) => x.trim()).filter(Boolean) : [],
    }));
  });

export const createSpeedDateSlot = createServerFn()
  .validator((data: { datetime: string }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs");

    const db = getDb();
    const profile = db.query(
      "SELECT speed_date_enabled FROM pt_profiles WHERE user_id = ?"
    ).get(user.id) as any;

    if (!profile?.speed_date_enabled) {
      throw new Error("Enable speed date mode first");
    }

    db.query(
      "INSERT INTO speed_date_slots (pt_user_id, datetime, status) VALUES (?, ?, 'open')"
    ).run(user.id, data.datetime);

    return { success: true };
  });

export const joinSpeedDate = createServerFn()
  .validator((data: { slotId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "client") throw new Error("Only clients can join speed dates");

    const db = getDb();

    // Find an available PT slot - either the specified one or any open
    let slot: any;
    if (data.slotId > 0) {
      slot = db.query(
        "SELECT * FROM speed_date_slots WHERE id = ? AND status = 'open' AND datetime > datetime('now')"
      ).get(data.slotId) as any;
    } else {
      // Random matching: pick any open slot
      slot = db.query(
        "SELECT * FROM speed_date_slots WHERE status = 'open' AND datetime > datetime('now') ORDER BY RANDOM() LIMIT 1"
      ).get() as any;
    }

    if (!slot) throw new Error("No available speed date slots");

    db.query(
      "UPDATE speed_date_slots SET status = 'booked', client_id = ? WHERE id = ?"
    ).run(user.id, slot.id);

    // Create a pending speed date match (client implicitly accepts by booking)
    db.query(
      `INSERT INTO speed_date_matches (pt_user_id, client_user_id, slot_id, status)
       VALUES (?, ?, ?, 'client_accepted')`
    ).run(slot.pt_user_id, user.id, slot.id);

    // Get PT info
    const pt = db.query(
      "SELECT u.name, u.country, p.specialties, p.years_of_experience FROM users u JOIN pt_profiles p ON u.id = p.user_id WHERE u.id = ?"
    ).get(slot.pt_user_id) as any;

    return {
      success: true,
      slotId: slot.id,
      ptName: pt?.name || "PT",
      ptId: slot.pt_user_id,
      datetime: slot.datetime,
      specialties: pt?.specialties ? pt.specialties.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    };
  });

// ── Speed Date Match → Chat ───────────────────────────────

export const acceptSpeedDate = createServerFn()
  .validator((data: { matchId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const match = db.query(
      "SELECT * FROM speed_date_matches WHERE id = ?"
    ).get(data.matchId) as any;

    if (!match) throw new Error("Match not found");

    // PT accepts
    if (user.role === "pt" && match.pt_user_id === user.id) {
      if (match.status === "client_accepted") {
        // Both have now accepted → match!
        db.query(
          "UPDATE speed_date_matches SET status = 'matched' WHERE id = ?"
        ).run(data.matchId);

        // Create chat channel: insert system message
        if (!match.chat_created) {
          db.query(
            `INSERT INTO messages (sender_id, receiver_id, content, read)
             VALUES (?, ?, 'Dere har matchet! 💪 Start en samtale for å bli bedre kjent.', 1)`
          ).run(match.pt_user_id, match.client_user_id);

          db.query(
            "UPDATE speed_date_matches SET chat_created = 1 WHERE id = ?"
          ).run(data.matchId);
        }

        return { success: true, status: "matched", message: "Dere har matchet! Chatten er opprettet." };
      } else {
        db.query(
          "UPDATE speed_date_matches SET status = 'pt_accepted' WHERE id = ?"
        ).run(data.matchId);
        return { success: true, status: "pt_accepted", message: "Venter på at klienten aksepterer." };
      }
    }

    // Client accepts
    if (user.role === "client" && match.client_user_id === user.id) {
      if (match.status === "pt_accepted") {
        // Both have now accepted → match!
        db.query(
          "UPDATE speed_date_matches SET status = 'matched' WHERE id = ?"
        ).run(data.matchId);

        // Create chat channel
        if (!match.chat_created) {
          db.query(
            `INSERT INTO messages (sender_id, receiver_id, content, read)
             VALUES (?, ?, 'Dere har matchet! 💪 Start en samtale for å bli bedre kjent.', 1)`
          ).run(match.pt_user_id, match.client_user_id);

          db.query(
            "UPDATE speed_date_matches SET chat_created = 1 WHERE id = ?"
          ).run(data.matchId);
        }

        return { success: true, status: "matched", message: "Dere har matchet! Chatten er opprettet." };
      } else {
        db.query(
          "UPDATE speed_date_matches SET status = 'client_accepted' WHERE id = ?"
        ).run(data.matchId);
        return { success: true, status: "client_accepted", message: "Venter på at PT-en aksepterer." };
      }
    }

    throw new Error("You are not authorized to accept this match");
  });

export const declineSpeedDate = createServerFn()
  .validator((data: { matchId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const match = db.query(
      "SELECT * FROM speed_date_matches WHERE id = ?"
    ).get(data.matchId) as any;

    if (!match) throw new Error("Match not found");

    if ((user.role === "pt" && match.pt_user_id !== user.id) ||
        (user.role === "client" && match.client_user_id !== user.id)) {
      throw new Error("Not authorized");
    }

    db.query(
      "UPDATE speed_date_matches SET status = 'declined' WHERE id = ?"
    ).run(data.matchId);

    return { success: true, status: "declined" };
  });

export const getMySpeedDateMatches = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    const db = getDb();

    const matches = db.query(`
      SELECT 
        m.id, m.pt_user_id, m.client_user_id, m.slot_id, m.status, m.chat_created, m.created_at,
        sds.datetime as slot_datetime,
        CASE WHEN ? = m.pt_user_id THEN u2.name ELSE u1.name END as partner_name,
        CASE WHEN ? = m.pt_user_id THEN u2.profile_picture ELSE u1.profile_picture END as partner_avatar,
        CASE WHEN ? = m.pt_user_id THEN u2.id ELSE u1.id END as partner_id,
        CASE WHEN ? = m.pt_user_id THEN u2.role ELSE u1.role END as partner_role,
        CASE WHEN ? = m.pt_user_id THEN u2.country ELSE u1.country END as partner_country
      FROM speed_date_matches m
      JOIN users u1 ON m.pt_user_id = u1.id
      JOIN users u2 ON m.client_user_id = u2.id
      LEFT JOIN speed_date_slots sds ON m.slot_id = sds.id
      WHERE (m.pt_user_id = ? OR m.client_user_id = ?)
        AND m.status IN ('pending', 'pt_accepted', 'client_accepted', 'matched')
      ORDER BY m.created_at DESC
    `, user.id, user.id, user.id, user.id, user.id, user.id, user.id).all() as any[];

    return matches.map(m => ({
      id: m.id,
      ptUserId: m.pt_user_id,
      clientUserId: m.client_user_id,
      slotId: m.slot_id,
      status: m.status,
      chatCreated: !!m.chat_created,
      createdAt: m.created_at,
      slotDatetime: m.slot_datetime || "",
      partnerName: m.partner_name,
      partnerAvatar: m.partner_avatar || "",
      partnerId: m.partner_id,
      partnerRole: m.partner_role,
      partnerCountry: m.partner_country || "",
    }));
  });

// ── PT Match List (dedicated PT view) ──────────────────────

export const getPTMatches = createServerFn()
  .handler(async () => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs can view their matches");

    const db = getDb();

    const matches = db.query(`
      SELECT 
        m.id, m.pt_user_id, m.client_user_id, m.slot_id, m.status, m.chat_created, m.created_at,
        u.name as client_name,
        u.profile_picture as client_profile_picture,
        u.country as client_country,
        sds.datetime as slot_datetime
      FROM speed_date_matches m
      JOIN users u ON m.client_user_id = u.id
      LEFT JOIN speed_date_slots sds ON m.slot_id = sds.id
      WHERE m.pt_user_id = ?
        AND m.status IN ('pending', 'pt_accepted', 'client_accepted', 'matched')
      ORDER BY m.created_at DESC
    `, user.id).all() as any[];

    return matches.map(m => ({
      id: m.id,
      ptUserId: m.pt_user_id,
      clientUserId: m.client_user_id,
      clientName: m.client_name,
      clientProfilePicture: m.client_profile_picture || "",
      clientCountry: m.client_country || "",
      slotId: m.slot_id,
      status: m.status,
      chatCreated: !!m.chat_created,
      createdAt: m.created_at,
      slotDatetime: m.slot_datetime || "",
    }));
  });

// ── Countries & Specialties (for filters) ─────────────────

export const getAvailableCountries = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      "SELECT DISTINCT country FROM users WHERE role = 'pt' AND country != '' AND profile_picture IS NOT NULL AND profile_picture != '' ORDER BY country"
    ).all() as any[];
    return rows.map((r: any) => r.country);
  });

export const getAvailableSpecialties = createServerFn()
  .handler(async () => {
    const db = getDb();
    const rows = db.query(
      "SELECT DISTINCT p.specialties FROM pt_profiles p JOIN users u ON p.user_id = u.id WHERE p.verification_status = 'approved' AND p.specialties != '' AND u.profile_picture IS NOT NULL AND u.profile_picture != ''"
    ).all() as any[];
    const all = new Set<string>();
    for (const r of rows) {
      if (r.specialties) {
        r.specialties.split(",").forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed) all.add(trimmed);
        });
      }
    }
    return Array.from(all).sort();
  });

// ── Update PT Profile (specialties, rate) ─────────────────

export const updatePtProfile = createServerFn()
  .validator((data: {
    specialties?: string;
    hourlyRate?: number;
    bio?: string;
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    if (user.role !== "pt") throw new Error("Only PTs");

    const db = getDb();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.specialties !== undefined) {
      updates.push("specialties = ?");
      params.push(data.specialties);
    }
    if (data.hourlyRate !== undefined) {
      updates.push("hourly_rate = ?");
      params.push(data.hourlyRate);
    }
    if (data.bio !== undefined) {
      updates.push("bio = ?");
      params.push(data.bio);
    }

    if (updates.length > 0) {
      params.push(user.id);
      db.query(`UPDATE pt_profiles SET ${updates.join(", ")} WHERE user_id = ?`).run(...params);
    }

    return { success: true };
  });
