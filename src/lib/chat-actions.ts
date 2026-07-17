import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/lib/db";

// ── Auth helper ──────────────────────────────────────────
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
  // Simple: look up userId from sessions table
  const db = getDb();
  const row = db.query(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).get(token) as { user_id: number } | undefined;
  return row?.user_id || null;
}

// ── Country detection helpers ────────────────────────────
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  "Norge": ["norge", "norway", "norsk", "norwegian", "oslo", "bergen", "trondheim", "stavanger"],
  "Sverige": ["sverige", "sweden", "svensk", "swedish", "stockholm", "göteborg", "gothenburg", "malmö"],
  "Danmark": ["danmark", "denmark", "dansk", "danish", "københavn", "copenhagen", "aarhus"],
  "Finland": ["finland", "finsk", "finnish", "helsinki", "helsingfors"],
  "USA": ["usa", "united states", "america", "american", "new york", "california", "texas", "florida"],
  "UK": ["uk", "united kingdom", "england", "british", "london", "manchester", "birmingham"],
  "Tyskland": ["tyskland", "germany", "tysk", "german", "berlin", "münchen", "munich", "hamburg"],
  "Frankrike": ["frankrike", "france", "fransk", "french", "paris", "lyon", "marseille"],
  "Spania": ["spania", "spain", "spansk", "spanish", "madrid", "barcelona", "valencia"],
  "Italia": ["italia", "italy", "italiensk", "italian", "rome", "milano", "milan", "firenze"],
  "Nederland": ["nederland", "netherlands", "nederlandsk", "dutch", "amsterdam", "rotterdam"],
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  "weight_loss": ["gå ned i vekt", "vektnedgang", "slanking", "slanke", "lose weight", "weight loss", "gå ned", "slank", "slimming", "weightloss", "slim"],
  "muscle_gain": ["bygge muskler", "muskelbygging", "gain weight", "muscle gain", "bulk", "bygge", "muskler", "gain muscle", "build muscle", "muscle"],
  "cardio": ["kondisjon", "cardio", "utholdenhet", "løping", "running", "endurance", "kondis", "stamina", "jogging"],
  "strength": ["styrke", "strength", "styrketrening", "powerlifting", "power", "løfte tungt", "tungt"],
  "general": ["generell", "generelt", "general", "allround", "komme i form", "get fit", "fitness", "trening", "exercise"],
};

// ── Smart AI Engine ──────────────────────────────────────
interface PTInfo {
  id: number;
  name: string;
  country: string;
  years_of_experience: number;
  specialties: string;
  hourly_rate: number;
  ratingPct: number;
  totalRatings: number;
  goodCount: number;
  okayCount: number;
  badCount: number;
}

function detectCountry(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return country;
    }
  }
  return null;
}

function detectGoal(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return goal;
    }
  }
  return null;
}

function detectIntent(query: string): {
  type: "pt_recommendation" | "pt_info" | "platform_info" | "greeting" | "general";
  params: { country?: string; goal?: string; ptName?: string; topic?: string };
} {
  const lower = query.toLowerCase();

  // Greeting detection
  const greetings = ["hei", "hallo", "hello", "hi", "hey", "god dag", "god kveld", "good morning", "good evening", "sup", "yo"];
  const isGreeting = greetings.some(g => lower.startsWith(g) || lower === g);
  if (isGreeting && query.length < 30) {
    return { type: "greeting", params: {} };
  }

  // PT recommendation patterns
  const ptRecPatterns = [
    "finn en pt", "finne en pt", "anbefal en pt", "anbefale en pt", "pt i ",
    "personlig trener", "personal trainer", "recommend a pt", "recommend pt",
    "find a pt", "find pt", "hvem er best", "top pt", "beste pt",
    "pt som", "trener som", "trainer who", "pt who",
    "jeg vil ha en pt", "jeg trenger en pt", "i need a pt", "i want a pt",
    "hvilken pt", "which pt", "pt for", "trener for",
  ];
  const isPtRec = ptRecPatterns.some(p => lower.includes(p));
  if (isPtRec) {
    return {
      type: "pt_recommendation",
      params: {
        country: detectCountry(query) || undefined,
        goal: detectGoal(query) || undefined,
      },
    };
  }

  // PT info patterns (who is, top rated, etc.)
  const ptInfoPatterns = [
    "hvem er", "who is", "top rated", "top pt", "best pt", "beste pt",
    "hvilke pt", "which pt", "pt rangering", "pt leaderboard",
    "pt med", "trener med", "spesialiserer", "specializes",
  ];
  const isPtInfo = ptInfoPatterns.some(p => lower.includes(p));
  if (isPtInfo) {
    // Try to extract PT name
    const db = getDb();
    const allPTs = db.query(
      "SELECT u.name FROM users u JOIN pt_profiles p ON u.id = p.user_id WHERE u.role = 'pt' AND p.verification_status = 'approved'"
    ).all() as { name: string }[];
    let ptName: string | undefined;
    for (const pt of allPTs) {
      if (lower.includes(pt.name.toLowerCase())) {
        ptName = pt.name;
        break;
      }
    }
    return {
      type: "pt_info",
      params: {
        country: detectCountry(query) || undefined,
        goal: detectGoal(query) || undefined,
        ptName,
      },
    };
  }

  // Platform info patterns
  const platformPatterns = [
    "pris", "price", "koster", "cost", "plan", "abonnement", "subscription",
    "prøve", "trial", "free", "gratis", "hvordan fungerer", "how does",
    "hva er", "what is", "hvilke funksjoner", "features", "hva kan",
    "hvordan bruke", "how to use", "hvordan registrere", "how to register",
    "hvordan booke", "how to book", "pt booking", "speed date",
    "konkurranse", "competition", "ranking", "leaderboard",
    "video", "bevegelseskorreksjon", "form correction", "stemmeveiledning",
    "voice guidance", "pustemåling", "breath", "matskanning", "food scan",
    "musikk", "music", "3d", "muskelvisualisering", "muscle visualization",
    "flexora", "plattform", "platform",
  ];
  const isPlatform = platformPatterns.some(p => lower.includes(p));
  if (isPlatform) {
    let topic = "general";
    if (lower.includes("pris") || lower.includes("price") || lower.includes("koster") || lower.includes("cost") || lower.includes("plan") || lower.includes("abonnement")) {
      topic = "pricing";
    } else if (lower.includes("prøve") || lower.includes("trial") || lower.includes("free") || lower.includes("gratis")) {
      topic = "trial";
    } else if (lower.includes("booke") || lower.includes("book") || lower.includes("pt booking") || lower.includes("speed date")) {
      topic = "booking";
    } else if (lower.includes("konkurranse") || lower.includes("competition") || lower.includes("ranking")) {
      topic = "competitions";
    } else if (lower.includes("funksjon") || lower.includes("feature") || lower.includes("kan")) {
      topic = "features";
    }
    return { type: "platform_info", params: { topic } };
  }

  return { type: "general", params: {} };
}

function queryPTs(db: ReturnType<typeof getDb>, country?: string, goal?: string, limit = 3): PTInfo[] {
  let query = `
    SELECT
      u.id,
      u.name,
      u.country,
      p.years_of_experience,
      p.specialties,
      p.hourly_rate,
      COUNT(r.id) as total_ratings,
      SUM(CASE WHEN r.rating = 'good' THEN 1 ELSE 0 END) as good_count,
      SUM(CASE WHEN r.rating = 'okay' THEN 1 ELSE 0 END) as okay_count,
      SUM(CASE WHEN r.rating = 'bad' THEN 1 ELSE 0 END) as bad_count
    FROM users u
    JOIN pt_profiles p ON u.id = p.user_id
    LEFT JOIN pt_ratings r ON r.pt_user_id = u.id
    WHERE u.role = 'pt' AND p.verification_status = 'approved'
  `;

  const params: (string | number)[] = [];

  if (country) {
    query += " AND u.country = ?";
    params.push(country);
  }

  query += " GROUP BY u.id";

  // If goal specified, try to match specialties
  const goalMap: Record<string, string> = {
    "weight_loss": "vektnedgang",
    "muscle_gain": "muskelbygging",
    "cardio": "kondisjon",
    "strength": "styrke",
    "general": "generell",
  };

  // Order by rating score then by total ratings
  query += `
    ORDER BY
      CASE WHEN COUNT(r.id) > 0
        THEN (SUM(CASE WHEN r.rating = 'good' THEN 1.0 ELSE 0 END) + SUM(CASE WHEN r.rating = 'okay' THEN 0.5 ELSE 0 END)) * 1.0 / COUNT(r.id)
        ELSE 0
      END DESC,
      COUNT(r.id) DESC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.query(query).all(...params) as any[];

  // If goal specified, boost PTs whose specialties match the goal
  let results = rows.map(row => {
    const total = row.total_ratings || 0;
    const good = row.good_count || 0;
    const okay = row.okay_count || 0;
    return {
      id: row.id,
      name: row.name,
      country: row.country || "",
      years_of_experience: row.years_of_experience || 0,
      specialties: row.specialties || "",
      hourly_rate: row.hourly_rate || 500,
      ratingPct: total > 0 ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100) : 0,
      totalRatings: total,
      goodCount: good,
      okayCount: okay,
      badCount: row.bad_count || 0,
    };
  });

  // If goal specified, reorder: boost PTs with matching specialties
  if (goal && goal !== "general") {
    const goalKeywords = GOAL_KEYWORDS[goal] || [];
    results.sort((a, b) => {
      const aMatch = goalKeywords.some(kw => a.specialties.toLowerCase().includes(kw)) ? 1 : 0;
      const bMatch = goalKeywords.some(kw => b.specialties.toLowerCase().includes(kw)) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.ratingPct - a.ratingPct;
    });
  }

  return results.slice(0, limit);
}

function getPTByName(db: ReturnType<typeof getDb>, name: string): PTInfo | null {
  const row = db.query(
    `SELECT
      u.id, u.name, u.country,
      p.years_of_experience, p.specialties, p.hourly_rate,
      COUNT(r.id) as total_ratings,
      SUM(CASE WHEN r.rating = 'good' THEN 1 ELSE 0 END) as good_count,
      SUM(CASE WHEN r.rating = 'okay' THEN 1 ELSE 0 END) as okay_count,
      SUM(CASE WHEN r.rating = 'bad' THEN 1 ELSE 0 END) as bad_count
    FROM users u
    JOIN pt_profiles p ON u.id = p.user_id
    LEFT JOIN pt_ratings r ON r.pt_user_id = u.id
    WHERE u.role = 'pt' AND u.name LIKE ?
    GROUP BY u.id`
  ).get(`%${name}%`) as any;

  if (!row) return null;
  const total = row.total_ratings || 0;
  const good = row.good_count || 0;
  const okay = row.okay_count || 0;
  return {
    id: row.id,
    name: row.name,
    country: row.country || "",
    years_of_experience: row.years_of_experience || 0,
    specialties: row.specialties || "",
    hourly_rate: row.hourly_rate || 500,
    ratingPct: total > 0 ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100) : 0,
    totalRatings: total,
    goodCount: good,
    okayCount: okay,
    badCount: row.bad_count || 0,
  };
}

function formatPtList(pts: PTInfo[], country?: string, goal?: string): string {
  if (pts.length === 0) {
    let msg = "Beklager, jeg fant ingen PT-er";
    if (country) msg += ` i ${country}`;
    if (goal) {
      const goalNames: Record<string, string> = {
        weight_loss: "vekttap", muscle_gain: "muskelbygging", cardio: "kondisjon", strength: "styrke",
      };
      msg += ` som spesialiserer seg på ${goalNames[goal] || goal}`;
    }
    msg += ". Prøv å utvide søket ditt eller kom tilbake senere! 📍";
    return msg;
  }

  let msg = "";
  if (country && goal) {
    const goalNames: Record<string, string> = {
      weight_loss: "vekttap 🏃", muscle_gain: "muskelbygging 💪", cardio: "kondisjonstrening ❤️", strength: "styrketrening 🏋️",
    };
    msg = `Her er de beste PT-ene i **${country}** for **${goalNames[goal] || goal}**:\n\n`;
  } else if (country) {
    msg = `Her er de beste PT-ene i **${country}**:\n\n`;
  } else if (goal) {
    const goalNames: Record<string, string> = {
      weight_loss: "vekttap 🏃", muscle_gain: "muskelbygging 💪", cardio: "kondisjonstrening ❤️", strength: "styrketrening 🏋️",
    };
    msg = `Her er de beste PT-ene for **${goalNames[goal] || goal}**:\n\n`;
  } else {
    msg = "Her er våre topprangerte PT-er:\n\n";
  }

  pts.forEach((pt, i) => {
    const stars = pt.ratingPct >= 90 ? "⭐⭐⭐⭐⭐" : pt.ratingPct >= 80 ? "⭐⭐⭐⭐" : pt.ratingPct >= 70 ? "⭐⭐⭐" : "⭐⭐";
    msg += `**${i + 1}. ${pt.name}** ${stars}\n`;
    msg += `📍 ${pt.country || "Ukjent"} | 🎓 ${pt.years_of_experience} års erfaring\n`;
    msg += `💬 ${pt.totalRatings} vurderinger (${pt.ratingPct}% fornøyde)\n`;
    if (pt.specialties) msg += `🏷️ Spesialiteter: ${pt.specialties}\n`;
    msg += `💰 ${pt.hourly_rate} kr/time\n\n`;
  });

  msg += "Vil du booke en time? Gå til **Finn PT** i menyen! 📅";
  return msg;
}

const PLATFORM_RESPONSES: Record<string, string> = {
  pricing: `**Flexora Fitnes – Priser og Abonnementer 💙**

Vi tilbyr tre abonnementsnivåer for kunder:

**Basis – 149 kr/mnd** 🏠
✅ Treningsplaner, chat, ranking, matskanning, musikk, konkurranser

**Hybrid – 249 kr/mnd** ⚡
✅ Alt i Basis + AI-PT, opprett grupper, arranger konkurranser

**Premium – 399 kr/mnd** 👑
✅ Alt i Hybrid + live video, bevegelseskorreksjon, pustemåling, 1:1 PT-timer

**For PT-er: 199 kr/mnd** 🎯
✅ Profil, markedsføring, speed date, tilgang til global kundebase

📌 Plattformen tar 10–15 % provisjon per booket PT-time.

Vil du vite mer om et spesifikt abonnement?`,
  trial: `**Prøveperioden hos Flexora Fitnes 🎁**

Vi tilbyr en **14-dagers gratis prøveperiode** på alle våre abonnementer! 

✅ Ingen bindingstid
✅ Full tilgang til alle funksjoner
✅ Du kan når som helst oppgradere eller avslutte

Etter prøveperioden fornyes abonnementet automatisk til valgt plan. Du får en påminnelse før prøveperioden utløper.

Klar til å komme i gang? Registrer deg nå! 🚀`,
  booking: `**Slik booker du en PT-time 📅**

1. **Finn en PT** – Bla gjennom våre verifiserte PT-er, filtrer på land, mål eller spesialitet
2. **Speed Date** – Match med PT-er gjennom vår "speed date"-funksjon for å finne den perfekte matchen
3. **Velg tid** – Se PT-ens tilgjengelige tider og velg det som passer deg
4. **Bekreft** – Betaling og bekreftelse skjer via plattformen
5. **Møt opp** – Delta på live video-økten med bevegelseskorreksjon!

Alle PT-er er profesjonelle, verifiserte trenere med dokumentert utdanning. ✅`,
  competitions: `**Konkurranser og Ranking 🏆**

Flexora Fitnes har et globalt rangeringssystem og konkurranser:

🏅 **Typer konkurranser:**
- Repetisjoner: Flest reps vinner
- Varighet: Mest treningstid
- Konsistens: Beste streak
- Vekttap: Størst fremgang

🌍 **Global og landsspesifikk:**
- Delta i globale konkurranser eller konkurrer med ditt eget land
- Premier inkluderer gavekort, premium-medlemskap og troféer

📊 **Ranking:**
- Tjen poeng for hver fullførte treningsøkt
- Klatre på den globale ledertavlen!

Vil du se pågående konkurranser? Sjekk ut Konkurranser-siden!`,
  features: `**Flexora Fitnes Funksjoner 🚀**

Vår plattform tilbyr en komplett treningsreise:

🎯 **3D Muskelvisualisering** – Se nøyaktig hvilke muskler du trener
📹 **Live Video med Bevegelseskorreksjon** – AI analyserer formen din i sanntid
🎤 **Stemmeveiledning** – Få instruksjoner mens du trener
🫁 **Pustemåling** – Optimaliser pusten under øktene
🎨 **Fargekodet Innsats** – Grønn/Gul/Rød for å måle intensitet
⏱️ **Automatisk Timer** – Perfekt timing mellom sett
📸 **Matskanning** – Skann maten for ernæringsdata
🎵 **Musikk-integrasjon** – Tren med din egen musikk

Spør meg gjerne om detaljer om noen av funksjonene!`,
  general: `**Velkommen til Flexora Fitnes! 💙**

Flexora Fitnes er en **global, tosidig PT-markedsplass og AI-drevet treningsplattform**. 

For **kunder** tilbyr vi en komplett treningsreise med 3D-muskelvisualisering, live video med bevegelseskorreksjon, stemmeveiledning, pustemåling, og mye mer.

For **PT-er** tilbyr vi en plattform for å markedsføre seg globalt, booke kunder og bygge sin virksomhet.

💬 **Hva kan jeg hjelpe deg med?**
- Finn en PT i ditt område
- Informasjon om priser og abonnementer
- Hvordan plattformen fungerer
- Anbefalinger basert på dine mål

Bare spør! 😊`,
};

const GREETING_RESPONSES = [
  "Hei! 👋 Jeg er Flexora Fitnes sin AI-assistent. Jeg kan hjelpe deg med å finne en PT, svare på spørsmål om plattformen, eller anbefale abonnementer. Hva lurer du på? 💙",
  "Hallo! 🎯 Velkommen til Flexora Fitnes! Jeg kan hjelpe deg med å finne den perfekte PT-en, forklare priser, eller fortelle om våre funksjoner. Hva kan jeg hjelpe med?",
  "Hei hei! 😊 Jeg er her for å hjelpe deg med alt om Flexora Fitnes. Trenger du en PT? Lurer du på priser? Eller vil du vite mer om plattformen? Bare spør!",
  "God dag! 💪 Klar for å ta treningen til neste nivå? Jeg kan anbefale PT-er basert på dine mål, forklare abonnementer, eller fortelle om våre unike funksjoner. Hva interesserer deg?",
];

const GENERAL_RESPONSES = [
  "Beklager, jeg forstod ikke helt det. Jeg kan hjelpe deg med:\n\n🔍 **Finn en PT** – Si f.eks. «Finn en PT i Norge for vekttap»\n💰 **Priser** – Spør «Hva koster det?»\n📋 **Funksjoner** – Spør «Hvilke funksjoner har Flexora?»\n📅 **Booking** – Spør «Hvordan booker jeg en PT?»\n\nPrøv igjen! 😊",
  "Jeg er ikke helt sikker på hva du mener. Her er noen ting jeg kan hjelpe med:\n\n• Anbefale PT-er basert på land og mål\n• Forklare priser og abonnementer\n• Fortelle om plattformens funksjoner\n• Hjelpe med booking og konkurranser\n\nStill meg gjerne et mer spesifikt spørsmål! 💙",
];

function generateResponse(query: string, db: ReturnType<typeof getDb>): string {
  const intent = detectIntent(query);

  switch (intent.type) {
    case "greeting": {
      return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
    }

    case "pt_recommendation": {
      const { country, goal } = intent.params;
      const pts = queryPTs(db, country, goal, 3);
      return formatPtList(pts, country, goal);
    }

    case "pt_info": {
      const { country, goal, ptName } = intent.params;
      if (ptName) {
        const pt = getPTByName(db, ptName);
        if (pt) {
          const stars = pt.ratingPct >= 90 ? "⭐⭐⭐⭐⭐" : pt.ratingPct >= 80 ? "⭐⭐⭐⭐" : pt.ratingPct >= 70 ? "⭐⭐⭐" : "⭐⭐";
          return `**${pt.name}** ${stars}\n\n📍 ${pt.country || "Ukjent"}\n🎓 ${pt.years_of_experience} års erfaring\n💬 ${pt.totalRatings} vurderinger (${pt.ratingPct}% fornøyde)\n🏷️ Spesialiteter: ${pt.specialties || "Ingen spesifisert"}\n💰 ${pt.hourly_rate} kr/time\n\nVil du booke en time med ${pt.name}? 📅`;
        }
      }
      // Fall through to general PT listing
      const pts = queryPTs(db, country, goal, 5);
      return formatPtList(pts, country, goal);
    }

    case "platform_info": {
      const topic = intent.params.topic || "general";
      return PLATFORM_RESPONSES[topic] || PLATFORM_RESPONSES.general;
    }

    default: {
      return GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
    }
  }
}

// ── Server Functions ─────────────────────────────────────

export const askAssistant = createServerFn()
  .validator((data: { question: string }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    const db = getDb();

    // Generate response
    const response = generateResponse(data.question, db);

    // Save to chat history if user is logged in
    if (userId) {
      db.query(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)"
      ).run(userId, data.question);

      db.query(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)"
      ).run(userId, response);
    }

    return { response };
  });

export const getChatHistory = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId) return [];

    const db = getDb();
    const messages = db.query(
      "SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 100"
    ).all(userId) as any[];

    return messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: String(m.created_at),
    }));
  });

export const clearChatHistory = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { success: false };

    const db = getDb();
    db.query("DELETE FROM chat_messages WHERE user_id = ?").run(userId);
    return { success: true };
  });
