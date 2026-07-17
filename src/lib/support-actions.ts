import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";

// ── Auth helpers ──────────────────────────────────────────
function getTokenFromRequest(): string | null {
  const request = (globalThis as any).__request;
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

function isAdmin(userId: number): boolean {
  const db = getDb();
  const admin = db.query("SELECT user_id FROM admin_users WHERE user_id = ?").get(userId);
  return !!admin;
}

// ── Support intent detection ──────────────────────────────

const SUPPORT_CATEGORIES: Record<string, { keywords: string[]; responses: string[] }> = {
  betaling: {
    keywords: [
      "betaling", "betale", "betalt", "refusjon", "refund", "penger", "money",
      "faktura", "invoice", "kort", "card", "trukket", "charged", "trekk",
      "kostnad", "pris", "price", "rabatt", "discount", "betalingen",
    ],
    responses: [
      `**Betaling og Refusjon hos Flexora Fitnes 💳**

**Hvordan fungerer betaling?**
Alle abonnementer fornyes automatisk hver måned. Du kan bruke Visa, Mastercard, eller andre vanlige betalingskort.

**Refusjonspolicy:**
✅ Du kan kansellere når som helst — ingen bindingstid
✅ 14 dagers angrerett ved nytt abonnement
⚠️ PT-timer refunderes 100 % ved avbestilling minst 24 timer før
⚠️ Ved sen avbestilling refunderes 50 %
❌ Ved no-show refunderes ikke

**Trenger du refusjon?**
Kontakt oss via skjemaet nederst med detaljer om betalingen din, så hjelper vi deg! 💙`,
    ],
  },
  "pt-booking": {
    keywords: [
      "booke pt", "pt time", "pt-time", "pt booking", "bestille pt",
      "avbestille pt", "cancel pt", "pt session", "pt økt", "personlig trener",
      "speed date", "pt finn", "finne pt", "når pt", "pt ledig",
    ],
    responses: [
      `**PT-Booking — Slik fungerer det 📅**

**Slik booker du:**
1. Gå til **Finn PT** i menyen eller bruk chatten for anbefalinger
2. Velg en PT basert på land, mål og vurderinger
3. Velg en ledig tid fra PT-ens kalender
4. Bekreft bookingen — betaling skjer via plattformen

**Speed Date:**
Match raskt med PT-er gjennom vår "speed date"-funksjon! PT-er setter opp ledige tider, og du kan booke en kort introduksjonssamtale.

**Avbestilling:**
📌 Avbestill minst 24 timer før for full refusjon
📌 12–24 timer før: 50 % refusjon
📌 Mindre enn 12 timer: ingen refusjon

**Problemer med en booking?** Beskriv problemet, så hjelper vi deg!`,
    ],
  },
  trening: {
    keywords: [
      "trening", "trene", "workout", "øvelse", "exercise", "treningsplan",
      "plan", "program", "hvordan trene", "treningsøkt", "økter",
      "muskler", "muskel", "styrke", "cardio", "vekt", "vektnedgang",
    ],
    responses: [
      `**Trening og Treningsplaner 🏋️**

**Treningsplaner:**
Flexora tilbyr personlige treningsplaner basert på dine mål:
- 🏃 **Vekttap** — Cardio-fokus med kaloriunderskudd
- 💪 **Muskelbygging** — Progressiv overload med styrkeøvelser
- ❤️ **Kondisjon** — Løping, sykling, intervalltrening
- 🏋️ **Styrke** — Vektløfting og motstandstrening

**AI-PT (Hybrid og Premium):**
Få en AI-drevet personlig trener som tilpasser planen din basert på fremgangen din!

**3D Muskelvisualisering:**
Se nøyaktig hvilke muskler du aktiverer i hver øvelse — tilgjengelig på alle abonnementer.

**Bevegelseskorreksjon (Premium):**
AI-en analyserer bevegelsene dine via kamera og gir sanntids tilbakemelding.

Har du spørsmål om en spesifikk øvelse eller plan? 💙`,
    ],
  },
  abonnement: {
    keywords: [
      "abonnement", "subscription", "plan", "nivå", "basis", "hybrid",
      "premium", "oppgradere", "upgrade", "nedgradere", "downgrade",
      "kansellere", "cancel", "si opp", "avslutte", "stoppe",
      "prøveperiode", "trial", "gratis", "free",
    ],
    responses: [
      `**Abonnementer hos Flexora Fitnes 💙**

**Kundeabonnementer:**
| Plan | Pris | Høydepunkter |
|------|------|-------------|
| **Basis** | 149 kr/mnd | Planer, chat, ranking, matskanning, musikk, konkurranser |
| **Hybrid** | 249 kr/mnd | + AI-PT, grupper, arranger konkurranser |
| **Premium** | 399 kr/mnd | + Live video, bevegelseskorreksjon, pustemåling, 1:1 PT |

**PT-abonnement:** 199 kr/mnd — Profil, markedsføring, speed date, kundebase

**Oppgradering/nedgradering:**
Du kan bytte plan når som helst fra **Mitt Abonnement**-siden. Ny pris trer i kraft ved neste fornyelse.

**Kansellering:**
✅ Ingen bindingstid — si opp når som helst
✅ 14 dagers angrerett
✅ Tilgangen fortsetter ut inneværende periode

Trenger du hjelp med abonnementet ditt?`,
    ],
  },
  "teknisk-hjelp": {
    keywords: [
      "teknisk", "technical", "feil", "error", "bug", "problem", "fungerer ikke",
      "krasj", "crash", "login", "logge inn", "passord", "password",
      "app", "mobil", "mobile", "nettleser", "browser", "video",
      "kamera", "camera", "lyd", "audio", "streaming", "oppdatering",
      "update", "versjon", "version",
    ],
    responses: [
      `**Teknisk Hjelp 🔧**

**Vanlige problemer og løsninger:**

🔐 **Innloggingsproblemer:**
- Bruk "Glemt passord" på innloggingssiden
- Sjekk at du bruker riktig e-post
- Prøv en annen nettleser

📹 **Kameraproblemer (live video):**
- Sørg for at nettleseren har kameratilgang
- Sjekk at kameraet ikke er i bruk av en annen app
- Prøv Chrome, Edge eller Safari (Firefox har begrenset støtte)

🎵 **Lydproblemer:**
- Sjekk at mikrofonen er aktivert i nettleseren
- Kontroller at lyden ikke er dempet i systeminnstillingene

📱 **Mobil:**
- Flexora fungerer best i moderne nettlesere på mobil
- iOS: Bruk Safari, Android: Bruk Chrome

**Fungerer fortsatt ikke?**
Beskriv problemet ditt og hvilken enhet/nettleser du bruker i skjemaet nedenfor, så hjelper vi deg!`,
    ],
  },
};

function detectSupportCategory(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [category, data] of Object.entries(SUPPORT_CATEGORIES)) {
    for (const kw of data.keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return null;
}

// ── Database query helpers ────────────────────────────────

function getUserSubscription(userId: number): {
  plan: string; status: string; startedAt: string; expiresAt: string;
} | null {
  const db = getDb();
  const row = db.query(
    "SELECT plan, status, started_at, expires_at FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1"
  ).get(userId) as any;
  if (!row) return null;
  return {
    plan: row.plan,
    status: row.status,
    startedAt: String(row.started_at),
    expiresAt: String(row.expires_at || ""),
  };
}

function getUserBookings(userId: number): any[] {
  const db = getDb();
  return db.query(
    `SELECT b.id, b.status, b.scheduled_at, b.created_at, b.payment_status,
            u.name as pt_name
     FROM pt_bookings b
     JOIN users u ON u.id = b.pt_id
     WHERE b.client_id = ?
     ORDER BY b.scheduled_at DESC
     LIMIT 5`
  ).all(userId) as any[];
}

function getUserWorkouts(userId: number): any[] {
  const db = getDb();
  return db.query(
    `SELECT ws.id, ws.started_at, ws.duration_seconds, ws.calories_estimated,
            wp.name as plan_name
     FROM workout_sessions ws
     JOIN workout_plans wp ON wp.id = ws.plan_id
     WHERE ws.user_id = ?
     ORDER BY ws.started_at DESC
     LIMIT 3`
  ).all(userId) as any[];
}

// ── Main AI Support Engine ────────────────────────────────

function generateSupportResponse(query: string, userId: number | null): string {
  const category = detectSupportCategory(query);

  // Check for user-specific data queries
  const lower = query.toLowerCase();

  if (userId) {
    // "Mitt abonnement" / "min plan" queries
    if (
      lower.includes("mitt abonnement") || lower.includes("min plan") ||
      lower.includes("min subscription") || lower.includes("my plan") ||
      lower.includes("hva har jeg") || lower.includes("hvilken plan har jeg")
    ) {
      const sub = getUserSubscription(userId);
      if (sub) {
        const planNames: Record<string, string> = {
          basis: "Basis (149 kr/mnd)", hybrid: "Hybrid (249 kr/mnd)",
          premium: "Premium (399 kr/mnd)", pt: "PT-abonnement (199 kr/mnd)",
        };
        return `**Ditt abonnement 💳**\n\n` +
          `📋 Plan: **${planNames[sub.plan] || sub.plan}**\n` +
          `📌 Status: **${sub.status === "active" ? "Aktiv ✅" : sub.status}**\n` +
          `📅 Startet: ${sub.startedAt}\n` +
          (sub.expiresAt ? `⏰ Utløper: ${sub.expiresAt}\n\n` : "\n") +
          `Du kan administrere abonnementet ditt på **Mitt Abonnement**-siden.`;
      }
      return "Du har ikke et aktivt abonnement akkurat nå. Gå til **Abonnement**-siden for å komme i gang! 💙";
    }

    // "Mine bookinger" queries
    if (
      lower.includes("mine bookinger") || lower.includes("my bookings") ||
      lower.includes("mine pt") || lower.includes("pt timer")
    ) {
      const bookings = getUserBookings(userId);
      if (bookings.length === 0) {
        return "Du har ingen PT-bookinger ennå. Gå til **Finn PT** for å booke din første time! 📅";
      }
      let resp = "**Dine PT-bookinger 📅**\n\n";
      bookings.forEach((b: any) => {
        const statusEmoji: Record<string, string> = {
          pending: "⏳", confirmed: "✅", completed: "✔️", cancelled: "❌",
        };
        resp += `${statusEmoji[b.status] || ""} **${b.pt_name}** — ${b.scheduled_at}\n`;
        resp += `   Status: ${b.status} | Betaling: ${b.payment_status || "—"}\n\n`;
      });
      return resp;
    }

    // "Min trening" queries
    if (
      lower.includes("min trening") || lower.includes("mine økter") ||
      lower.includes("my workouts") || lower.includes("treningshistorikk")
    ) {
      const workouts = getUserWorkouts(userId);
      if (workouts.length === 0) {
        return "Du har ingen fullførte treningsøkter ennå. Start en treningsøkt fra **Dashboard**! 💪";
      }
      let resp = "**Dine siste treningsøkter 💪**\n\n";
      workouts.forEach((w: any) => {
        const mins = Math.round((w.duration_seconds || 0) / 60);
        resp += `🏋️ **${w.plan_name || "Treningsøkt"}** — ${String(w.started_at).slice(0, 16)}\n`;
        resp += `   ⏱️ ${mins} min | 🔥 ~${w.calories_estimated || 0} kcal\n\n`;
      });
      return resp;
    }
  }

  // If matched a support category
  if (category) {
    const data = SUPPORT_CATEGORIES[category];
    return data.responses[0];
  }

  // Escalation trigger words
  const escalationWords = [
    "hjelp", "help", "problem", "issue", "klage", "complaint",
    "fungerer ikke", "not working", "feil", "error", "kan ikke",
    "cannot", "får ikke", "don't work", "snakke med", "talk to",
    "kontakte", "contact", "menneske", "human", "person",
  ];
  const needsEscalation = escalationWords.some(w => lower.includes(w));

  if (needsEscalation) {
    return `**Jeg forstår at du trenger ekstra hjelp 🫡**

Dette høres ut som noe som krever personlig oppfølging. Vennligst fyll ut skjemaet nedenfor, så vil support-teamet vårt ta kontakt med deg innen 24 timer.

**Tips:** Jo mer detaljert du beskriver problemet, jo raskere kan vi hjelpe deg!

👉 Bruk **"Kontakt support"-knappen** nedenfor for å sende inn en supportforespørsel.`;
  }

  // Default fallback
  return `**Hva kan jeg hjelpe deg med? 🤔**

Jeg kan svare på spørsmål om:
• 💳 **Betaling** — Refusjon, faktura, betalingsproblemer
• 📅 **PT-booking** — Booke, avbestille, finne rett PT
• 🏋️ **Trening** — Treningsplaner, øvelser, mål
• 📋 **Abonnement** — Priser, oppgradering, kansellering
• 🔧 **Teknisk hjelp** — Feil, problemer, innlogging

Du kan også spørre meg om **ditt abonnement**, **dine bookinger**, eller **din treningshistorikk**!

Velg gjerne et emne fra knappene nedenfor, eller beskriv problemet ditt. 💙`;
}

// ── Server Functions ─────────────────────────────────────

export const askSupport = createServerFn()
  .validator((data: { question: string }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    const db = getDb();

    const response = generateSupportResponse(data.question, userId);

    // Save to chat history
    if (userId) {
      db.query(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)"
      ).run(userId, data.question);
      db.query(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)"
      ).run(userId, response);
    }

    return { response, escalated: response.includes("Kontakt support") || response.includes("supportforespørsel") };
  });

export const submitSupportTicket = createServerFn()
  .validator((data: { subject: string; message: string }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    const db = getDb();

    db.query(
      "INSERT INTO support_tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'open')"
    ).run(userId, data.subject, data.message);

    return {
      success: true,
      message: "Takk for din henvendelse! Support-teamet vårt vil ta kontakt innen 24 timer. 💙",
    };
  });

export const getSupportTickets = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId || !isAdmin(userId)) {
      return { admin: false, tickets: [], counts: { open: 0, closed: 0 } };
    }

    const db = getDb();
    const tickets = db.query(
      `SELECT t.id, t.subject, t.message, t.status, t.created_at,
              COALESCE(u.name, 'Ukjent') as user_name, u.email as user_email
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT 100`
    ).all() as any[];

    const openCount = (db.query(
      "SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open'"
    ).get() as any)?.cnt || 0;

    const closedCount = (db.query(
      "SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'closed'"
    ).get() as any)?.cnt || 0;

    // Common issues: group by category keyword
    const commonIssues = db.query(
      `SELECT subject, COUNT(*) as cnt FROM support_tickets
       WHERE status = 'open'
       GROUP BY subject ORDER BY cnt DESC LIMIT 5`
    ).all() as any[];

    return {
      admin: true,
      tickets: tickets.map((t: any) => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        userName: t.user_name,
        userEmail: t.user_email,
        createdAt: String(t.created_at),
      })),
      counts: { open: openCount, closed: closedCount },
      commonIssues: commonIssues.map((c: any) => ({
        subject: c.subject,
        count: c.cnt,
      })),
    };
  });

export const closeSupportTicket = createServerFn()
  .validator((data: { ticketId: number }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    if (!userId || !isAdmin(userId)) {
      return { success: false, error: "Admin access required" };
    }

    const db = getDb();
    db.query(
      "UPDATE support_tickets SET status = 'closed' WHERE id = ?"
    ).run(data.ticketId);

    return { success: true };
  });

export const getOpenTicketCount = createServerFn()
  .handler(async () => {
    const db = getDb();
    const count = (db.query(
      "SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open'"
    ).get() as any)?.cnt || 0;
    return { count };
  });
