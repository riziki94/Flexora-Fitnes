import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getUserFromToken } from "~/lib/auth";

// --- Auth helper (same pattern as booking-actions) ---
async function getAuthUser() {
  const request = (globalThis as any).__request;
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

// ── Get Booking Info for Video ────────────────────────────

export const getVideoBookingInfo = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query(`
      SELECT pb.*,
             c.name as client_name,
             p.name as pt_name,
             c.id as client_id,
             p.id as pt_id
      FROM pt_bookings pb
      JOIN users c ON pb.client_id = c.id
      JOIN users p ON pb.pt_id = p.id
      WHERE pb.id = ?
    `).get(data.bookingId) as any;

    if (!booking) throw new Error("Booking not found");

    // Verify user is either client or PT of this booking
    if (user.id !== booking.client_id && user.id !== booking.pt_id) {
      throw new Error("You are not authorized to join this video session");
    }

    // Verify booking is confirmed/completed and session time is within window
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      throw new Error("This booking is not active");
    }

    // Check session time window (30 min before to 2 hours after)
    const now = new Date();
    const scheduledAt = new Date(booking.scheduled_at + "Z");
    const windowStart = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      // Still allow but note it's outside window
    }

    return {
      bookingId: booking.id,
      clientId: booking.client_id,
      ptId: booking.pt_id,
      clientName: booking.client_name,
      ptName: booking.pt_name,
      scheduledAt: booking.scheduled_at,
      sessionType: booking.session_type || "60min",
      myRole: user.id === booking.client_id ? "client" : "pt",
      myId: user.id,
      peerId: user.id === booking.client_id ? booking.pt_id : booking.client_id,
      peerName: user.id === booking.client_id ? booking.pt_name : booking.client_name,
      sessionDuration: booking.session_type === "30min" ? 30 : 60,
    };
  });

// ── Send Signaling Message ────────────────────────────────

export const sendSignalingMessage = createServerFn()
  .validator((data: {
    bookingId: number;
    type: "offer" | "answer" | "ice" | "hangup";
    data: string; // JSON stringified SDP or ICE candidate
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    // Verify user belongs to this booking
    const booking = db.query(
      "SELECT client_id, pt_id FROM pt_bookings WHERE id = ?"
    ).get(data.bookingId) as any;

    if (!booking) throw new Error("Booking not found");
    if (user.id !== booking.client_id && user.id !== booking.pt_id) {
      throw new Error("Not authorized for this session");
    }

    // Insert the signaling message
    db.query(
      `INSERT INTO signaling_messages (booking_id, sender_id, type, data)
       VALUES (?, ?, ?, ?)`
    ).run(data.bookingId, user.id, data.type, data.data);

    // Cleanup old messages (keep last 50 per booking)
    db.query(`
      DELETE FROM signaling_messages
      WHERE booking_id = ? AND id NOT IN (
        SELECT id FROM signaling_messages
        WHERE booking_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      )
    `).run(data.bookingId, data.bookingId);

    return { success: true };
  });

// ── Poll for Signaling Messages ───────────────────────────

export const pollSignalingMessages = createServerFn()
  .validator((data: {
    bookingId: number;
    afterId?: number; // Only get messages after this ID
  }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    // Verify user belongs to this booking
    const booking = db.query(
      "SELECT client_id, pt_id FROM pt_bookings WHERE id = ?"
    ).get(data.bookingId) as any;

    if (!booking) throw new Error("Booking not found");
    if (user.id !== booking.client_id && user.id !== booking.pt_id) {
      throw new Error("Not authorized for this session");
    }

    // Get messages from the OTHER user (not ourselves)
    // Get messages with ID > afterId
    let query = `
      SELECT id, sender_id, type, data, created_at
      FROM signaling_messages
      WHERE booking_id = ? AND sender_id != ?
    `;
    const params: any[] = [data.bookingId, user.id];

    if (data.afterId) {
      query += ` AND id > ?`;
      params.push(data.afterId);
    }

    query += ` ORDER BY id ASC LIMIT 20`;

    const messages = db.query(query).all(...params) as any[];

    // After getting messages, also check for hangup
    const hasHangup = messages.some((m: any) => m.type === "hangup");

    return {
      messages: messages || [],
      hasHangup,
      latestId: messages.length > 0 ? messages[messages.length - 1].id : (data.afterId || 0),
    };
  });

// ── End Call (cleanup) ────────────────────────────────────

export const endVideoCall = createServerFn()
  .validator((data: { bookingId: number }) => data)
  .handler(async ({ data }) => {
    const user = await getAuthUser();
    const db = getDb();

    const booking = db.query(
      "SELECT client_id, pt_id FROM pt_bookings WHERE id = ?"
    ).get(data.bookingId) as any;

    if (!booking) throw new Error("Booking not found");
    if (user.id !== booking.client_id && user.id !== booking.pt_id) {
      throw new Error("Not authorized for this session");
    }

    // Send hangup message
    db.query(
      `INSERT INTO signaling_messages (booking_id, sender_id, type, data)
       VALUES (?, ?, 'hangup', 'call-ended')`
    ).run(data.bookingId, user.id);

    return { success: true };
  });
