import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";
import { getServerRequest } from "~/lib/request-context";

// ── Auth helper ──────────────────────────────────────────
function getTokenFromRequest(): string | null {
  const request = getServerRequest();
  if (!request) return null;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/flexora_token=([^;]+)/);
  if (match) return match[1];
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

function getUserIdFromToken(): number | null {
  const token = getTokenFromRequest();
  if (!token) return null;
  const db = getDb();
  const row = db.query(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).get(token) as { user_id: number } | undefined;
  return row?.user_id || null;
}

function getUserRole(userId: number): string | null {
  const db = getDb();
  const row = db.query("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  return row?.role || null;
}

// ── Relationship check ──────────────────────────────────
function canMessage(db: ReturnType<typeof getDb>, userId: number, otherId: number): boolean {
  // Check if there's a confirmed or completed booking between them
  const booking = db.query(
    `SELECT id FROM pt_bookings 
     WHERE ((client_id = ? AND pt_id = ?) OR (client_id = ? AND pt_id = ?))
     AND status IN ('confirmed', 'completed')
     LIMIT 1`
  ).get(userId, otherId, otherId, userId) as any;
  if (booking) return true;

  // Check if there's a matched speed date
  const match = db.query(
    `SELECT id FROM speed_date_matches 
     WHERE ((pt_user_id = ? AND client_user_id = ?) OR (pt_user_id = ? AND client_user_id = ?))
     AND status = 'matched'
     LIMIT 1`
  ).get(userId, otherId, otherId, userId) as any;
  return !!match;
}

function getRelationship(db: ReturnType<typeof getDb>, userId: number, otherId: number): {
  canMessage: boolean;
  hasBooking: boolean;
  role: string;
} {
  const booking = db.query(
    `SELECT id, status FROM pt_bookings 
     WHERE ((client_id = ? AND pt_id = ?) OR (client_id = ? AND pt_id = ?))
     ORDER BY CASE status WHEN 'confirmed' THEN 0 WHEN 'completed' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END
     LIMIT 1`
  ).get(userId, otherId, otherId, userId) as any;

  return {
    canMessage: booking ? ["confirmed", "completed"].includes(booking.status) : false,
    hasBooking: !!booking,
    role: getUserRole(otherId) || "client",
  };
}

// ── Update presence ──────────────────────────────────────
function updatePresence(userId: number) {
  const db = getDb();
  db.query(
    "INSERT INTO user_presence (user_id, last_active_at) VALUES (?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET last_active_at = datetime('now')"
  ).run(userId);
}

// ── Server Functions ─────────────────────────────────────

// Get all conversations for the current user
export const getConversations = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Unauthorized");

    updatePresence(userId);
    const db = getDb();

    // Get all unique conversation partners with last message and unread count
    // Include both message-based conversations AND speed date matches
    const rows = db.query(`
      SELECT 
        partner.id as partner_id,
        partner.name as partner_name,
        partner.role as partner_role,
        partner.profile_picture as partner_avatar,
        partner.country as partner_country,
        last_msg.content as last_message,
        last_msg.created_at as last_message_at,
        last_msg.sender_id as last_sender_id,
        unread.cnt as unread_count,
        (SELECT last_active_at FROM user_presence WHERE user_id = partner.id) as last_active,
        conv.source_type,
        conv.match_status,
        conv.match_id,
        conv.slot_datetime,
        conv.chat_created
      FROM (
        SELECT partner_id, MAX(source_type) as source_type, MAX(match_status) as match_status,
               MAX(match_id) as match_id, MAX(slot_datetime) as slot_datetime,
               MAX(chat_created) as chat_created
        FROM (
          -- Message-based conversations
          SELECT DISTINCT 
            CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as partner_id,
            'message' as source_type,
            '' as match_status,
            0 as match_id,
            '' as slot_datetime,
            1 as chat_created
          FROM messages m
          WHERE m.sender_id = ? OR m.receiver_id = ?
          
          UNION ALL
          
          -- Speed date matches
          SELECT DISTINCT
            CASE WHEN sdm.pt_user_id = ? THEN sdm.client_user_id ELSE sdm.pt_user_id END as partner_id,
            'speed_date_match' as source_type,
            sdm.status as match_status,
            sdm.id as match_id,
            COALESCE(sds.datetime, '') as slot_datetime,
            sdm.chat_created as chat_created
          FROM speed_date_matches sdm
          LEFT JOIN speed_date_slots sds ON sdm.slot_id = sds.id
          WHERE (sdm.pt_user_id = ? OR sdm.client_user_id = ?)
            AND sdm.status IN ('client_accepted', 'pt_accepted', 'matched')
        )
        GROUP BY partner_id
      ) conv
      JOIN users partner ON partner.id = conv.partner_id
      LEFT JOIN (
        SELECT m.* FROM messages m
        WHERE m.id IN (
          SELECT MAX(m2.id) FROM messages m2
          WHERE (m2.sender_id = ? AND m2.receiver_id = conv.partner_id)
             OR (m2.receiver_id = ? AND m2.sender_id = conv.partner_id)
        )
      ) last_msg ON 1=1
      LEFT JOIN (
        SELECT sender_id, COUNT(*) as cnt FROM messages
        WHERE receiver_id = ? AND read = 0
        GROUP BY sender_id
      ) unread ON unread.sender_id = partner.id
      ORDER BY COALESCE(last_message_at, conv.slot_datetime) DESC NULLS LAST
    `, userId, userId, userId, userId, userId, userId, userId, userId, userId).all() as any[];

    return rows.map(r => ({
      partnerId: r.partner_id,
      partnerName: r.partner_name,
      partnerRole: r.partner_role,
      partnerAvatar: r.partner_avatar || "",
      partnerCountry: r.partner_country || "",
      lastMessage: r.last_message || "",
      lastMessageAt: r.last_message_at || "",
      lastSenderId: r.last_sender_id || 0,
      unreadCount: r.unread_count || 0,
      lastActive: r.last_active || "",
      sourceType: r.source_type || "message",
      matchStatus: r.match_status || "",
      matchId: r.match_id || 0,
      slotDatetime: r.slot_datetime || "",
      chatCreated: !!r.chat_created,
    }));
  });

// Get messages between current user and a partner
export const getMessages = createServerFn()
  .validator((data: { partnerId: number; sinceId?: number }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Unauthorized");

    updatePresence(userId);
    const db = getDb();

    let query = `
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.read, m.created_at,
             s.name as sender_name
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
    `;
    const params: any[] = [userId, data.partnerId, data.partnerId, userId];

    if (data.sinceId) {
      query += " AND m.id > ?";
      params.push(data.sinceId);
    }

    query += " ORDER BY m.created_at ASC LIMIT 100";

    const rows = db.query(query, ...params).all() as any[];

    // Mark messages as read
    db.query(
      "UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ? AND read = 0"
    ).run(userId, data.partnerId);

    return rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      content: r.content,
      read: !!r.read,
      createdAt: r.created_at,
      senderName: r.sender_name,
    }));
  });

// Send a message
export const sendMessage = createServerFn()
  .validator((data: { receiverId: number; content: string }) => {
    if (!data.content || !data.content.trim()) throw new Error("Message cannot be empty");
    if (!data.receiverId) throw new Error("Receiver is required");
    return { receiverId: data.receiverId, content: data.content.trim() };
  })
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Unauthorized");

    const db = getDb();

    // Check relationship
    const rel = getRelationship(db, userId, data.receiverId);
    if (!rel.canMessage) {
      throw new Error("You can only message users you have a confirmed booking with");
    }

    updatePresence(userId);

    const result = db.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)"
    ).run(userId, data.receiverId, data.content);

    const msg = db.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.read, m.created_at,
              s.name as sender_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       WHERE m.id = ?`
    ).get(Number(result.lastInsertRowid)) as any;

    return {
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content,
      read: !!msg.read,
      createdAt: msg.created_at,
      senderName: msg.sender_name,
    };
  });

// Mark all messages from a partner as read
export const markRead = createServerFn()
  .validator((data: { partnerId: number }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Unauthorized");

    const db = getDb();
    db.query(
      "UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ? AND read = 0"
    ).run(userId, data.partnerId);

    return { success: true };
  });

// Get total unread count (for badge) — includes new speed date matches
export const getUnreadCount = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId) return 0;

    const db = getDb();
    
    // Unread messages
    const row = db.query(
      "SELECT COUNT(*) as cnt FROM messages WHERE receiver_id = ? AND read = 0"
    ).get(userId) as { cnt: number } | undefined;
    
    let total = row?.cnt || 0;

    // New speed date matches where the user hasn't sent a message yet
    // (only the system message exists, no real conversation started)
    const newMatches = db.query(`
      SELECT COUNT(*) as cnt FROM speed_date_matches m
      WHERE (m.pt_user_id = ? OR m.client_user_id = ?)
        AND m.status = 'matched'
        AND m.chat_created = 1
        AND NOT EXISTS (
          SELECT 1 FROM messages ms
          WHERE ((ms.sender_id = ? AND ms.receiver_id = CASE WHEN m.pt_user_id = ? THEN m.client_user_id ELSE m.pt_user_id END)
             OR (ms.receiver_id = ? AND ms.sender_id = CASE WHEN m.pt_user_id = ? THEN m.client_user_id ELSE m.pt_user_id END))
            AND ms.sender_id != m.pt_user_id  -- exclude system message (which uses pt's id)
            AND ms.content != 'Dere har matchet! 💪 Start en samtale for å bli bedre kjent.'
        )
    `, userId, userId, userId, userId, userId, userId).get() as { cnt: number } | undefined;

    total += newMatches?.cnt || 0;

    return total;
  });

// Check relationship with another user
export const checkRelationship = createServerFn()
  .validator((data: { otherUserId: number }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error("Unauthorized");

    const db = getDb();
    return getRelationship(db, userId, data.otherUserId);
  });

// Get partner's presence info
export const getPartnerPresence = createServerFn()
  .validator((data: { partnerId: number }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const row = db.query(
      "SELECT last_active_at FROM user_presence WHERE user_id = ?"
    ).get(data.partnerId) as { last_active_at: string } | undefined;

    return {
      lastActive: row?.last_active_at || "",
    };
  });
