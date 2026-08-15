/**
 * Flexora Fitnes AI Assistant — local keyword-matching knowledge base.
 * No external API needed. Supports both Norwegian and English queries.
 */

interface QAPair {
  keywords: string[];
  answer: string;
}

const knowledgeBase: QAPair[] = [
  {
    keywords: [
      "flexora", "hva er flexora", "what is flexora", "om flexora",
      "plattform", "platform", "tjeneste", "service", "hva er dette",
      "what is this", "om dere", "about",
    ],
    answer:
      "**Flexora Fitnes** er en global, tosidig PT-markedsplass og AI-drevet treningsplattform. Du får en komplett treningsreise med 3D-muskelvisualisering, live video med bevegelseskorreksjon, stemmeveiledning, pustemåling, fargekodet innsats, automatisk timer, matskanning, musikk-integrasjon, ranking og globale konkurranser. I tillegg kan du booke PT-timer fra godkjente, verifiserte personlige trenere verden over — alt på ett sted.",
  },
  {
    keywords: [
      "pt", "personlig trener", "personal trainer", "booke", "booking",
      "book", "time", "timer", "session", "treningstime", "trener",
      "trainer", "coach", "markedsplass", "marketplace",
    ],
    answer:
      "Med Flexora Fitnes kan du **booke PT-timer fra verifiserte, profesjonelle PT-er** over hele verden:\n\n" +
      "1. Bla gjennom PT-profiler med diplom, erfaring og omtaler\n" +
      "2. Bruk **speed date** for å bli matchet med PT-er som passer dine mål\n" +
      "3. Book en time direkte — live video eller 1:1 via Premium-abonnementet\n\n" +
      "Kun verifiserte PT-er med dokumentert utdanning er godkjent på plattformen.",
  },
  {
    keywords: [
      "pris", "pricing", "koster", "kostnad", "abonnement", "subscription",
      "price", "cost", "hva koster", "priser", "tiers", "planer", "plans",
      "måned", "month", "basis", "hybrid", "premium", "kr", "nok",
    ],
    answer:
      "Flexora Fitnes har **tre kundeabonnementer** og ett PT-abonnement:\n\n" +
      " **Basis** — ~149 kr/mnd\n" +
      "   • Treningsplaner, chat, ranking, matskanning, musikk og konkurranser\n\n" +
      " **Hybrid** — ~249 kr/mnd\n" +
      "   • Alt i Basis + AI-PT, opprett grupper og arranger egne konkurranser\n\n" +
      " **Premium** — ~399 kr/mnd\n" +
      "   • Alt i Hybrid + live video, bevegelseskorreksjon, pustemåling og 1:1 PT\n\n" +
      " **PT-abonnement** — ~199 kr/mnd (for profesjonelle trenere)\n" +
      "   • Profil, markedsføring, speed date og tilgang til kundebasen\n\n" +
      "Alle abonnementer betales via Stripe. Gå til registreringssiden for å komme i gang!",
  },
  {
    keywords: [
      "3d", "muskel", "muscle", "visualisering", "visualization",
      "muskelvisualisering", "anatomi", "anatomy", "kroppen", "body",
    ],
    answer:
      "**3D-muskelvisualiseringen** viser deg nøyaktig hvilke muskler som jobber i hver øvelse. Du kan se treningsøkten din i 3D, følge muskelaktiveringen i sanntid og spore fremgangen din visuelt over tid — perfekt for alle nivåer, enten målet er vekt, muskler, cardio eller styrke.",
  },
  {
    keywords: [
      "bevegelse", "korreksjon", "form", "korrekt", "live video",
      "kamera", "camera", "teknikk", "technique", "øvelse", "exercise",
      "bevegelseskorreksjon",
    ],
    answer:
      "**Live video med bevegelseskorreksjon** gjør at AI-en analyserer teknikken din i sanntid og gir deg tilbakemelding — som å ha en PT som følger med på hver eneste repetisjon. Sammen med stemmeveiledning, pustemåling, fargekodet innsats og automatisk timer får du full feedback på hver økt. Funksjonen er inkludert i Premium-abonnementet.",
  },
  {
    keywords: [
      "stemme", "voice", "puste", "breath", "pustemåling", "innsats",
      "effort", "timer", "musikk", "music", "lyd", "veiledning",
      "guidance", "spotify", "tempo",
    ],
    answer:
      "Under økten får du **stemmeveiledning**, **pustemåling**, **fargekodet innsats** og en **automatisk timer** som holder styr på sett og pauser. Du kan også koble til musikkappen din og trene i takt med tempo-tilpassede spillelister. Alt dette gjør at du kan fokusere 100% på treningen.",
  },
  {
    keywords: [
      "mat", "food", "skanning", "scan", "ernæring", "nutrition",
      "kalorier", "calories", "kosthold", "diet", "makro", "macro",
    ],
    answer:
      "**Matskanningen** lar deg skanne måltidene dine og få kalori- og næringsinnhold med én gang. Kombinert med treningsplanene dine får du full oversikt over kosthold og trening på samme sted. Funksjonen er inkludert i Basis-abonnementet.",
  },
  {
    keywords: [
      "ranking", "konkurranse", "competition", "leaderboard", "global",
      "verden", "world", "utfordring", "challenge", "premie", "prize",
      "sponsor",
    ],
    answer:
      "Flexora Fitnes har **ranking og globale konkurranser** der du kan konkurrere mot treningsentusiaster over hele verden. Med Hybrid-abonnementet kan du opprette egne grupper og arrangere dine egne konkurranser — og du kan vinne premier fra sponsorer. Konkurranser er en morsom måte å holde motivasjonen oppe!",
  },
  {
    keywords: [
      "installer", "app", "pwa", "mobil", "phone", "installere",
      "nedlasting", "download", "home screen", "add to home",
      "homescreen", "app store", "google play",
    ],
    answer:
      "Flexora Fitnes er en **PWA** (Progressive Web App) — du trenger ikke laste ned fra App Store eller Google Play!\n\n" +
      "Slik installerer du:\n" +
      " **iPhone/iPad**: Åpne Flexora Fitnes i Safari, trykk på del-ikonet, og velg «Add to Home Screen».\n" +
      " **Android**: Åpne Flexora Fitnes i Chrome, trykk på menyen (⋮), og velg «Add to Home Screen».\n" +
      " **Desktop**: Åpne Flexora Fitnes i Chrome/Edge, og trykk på installasjonsikonet i adressefeltet.\n\n" +
      "Appen fungerer offline og gir deg rask tilgang til alle Flexora Fitnes-funksjoner.",
  },
  {
    keywords: [
      "bli pt", "bli personlig trener", "pt abonnement", "hvordan blir jeg pt",
      "sertifisert", "sertifikat", "diplom", "verifisert", "verified",
      "certified", "speed date", "utdanning", "education", "erfaring",
      "experience",
    ],
    answer:
      "Slik blir du **verifisert PT** på Flexora Fitnes:\n\n" +
      "1. Registrer deg med **PT-abonnementet** (~199 kr/mnd)\n" +
      "2. Last opp **diplom og dokumentasjon** på utdanningen din\n" +
      "3. Bygg profilen din med erfaring og spesialiteter\n" +
      "4. Bruk **speed date** for å matche med potensielle kunder\n\n" +
      "Plattformen tar 10–15% provisjon per booket PT-time. Kun verifiserte, profesjonelle PT-er med dokumentert utdanning blir godkjent.",
  },
  {
    keywords: [
      "hvor", "tilgjengelig", "location", "available", "land", "countries",
      "norge", "norway", "globalt", "internasjonalt", "international",
      "verdensomspennende", "worldwide",
    ],
    answer:
      "Flexora Fitnes er en **global plattform** — du kan trene og booke PT-er over hele verden, uansett hvor du befinner deg. PT-er kan markedsføre seg selv og få kunder globalt. Alt du trenger er internettforbindelse!",
  },
  {
    keywords: [
      "subscribe", "subscribing", "how do i subscribe", "betaling",
      "payment", "stripe", "kjøp", "buy", "purchase", "abonnere",
      "hvordan abonnerer", "bli medlem", "sign up", "registrere",
      "komme i gang", "get started",
    ],
    answer:
      "Slik kommer du i gang med Flexora Fitnes:\n\n" +
      "1. Registrer deg på landingssiden\n" +
      "2. Velg abonnementet som passer deg: Basis, Hybrid eller Premium\n" +
      "3. Klikk på betalingsknappen — du blir sendt til **Stripe** for sikker betaling\n" +
      "4. Etter betaling får du umiddelbar tilgang til alle funksjonene i ditt abonnement\n\n" +
      "Du kan når som helst oppgradere eller endre abonnementet ditt via kontosiden.",
  },
];

/** Welcome message shown on first open */
export const WELCOME_MESSAGE =
  "Hei!  Jeg er Hilde, Flexora Fitnes sin AI-assistent. Jeg kan hjelpe deg med alt om trening, priser og abonnementer, PT-booking, 3D-muskelvisualisering og konkurranser. Hva lurer du på?";

/** Fallback when no keyword match is found */
export const FALLBACK_RESPONSE =
  "Hei, jeg er Hilde!  Jeg kan hjelpe deg med spørsmål om Flexora Fitnes. Du kan for eksempel spørre om priser og abonnementer, hvordan du booker en PT, 3D-muskelvisualisering, matskanning, eller hvordan du installerer appen. Hva lurer du på? ";

/** Suggested questions shown as clickable chips */
export const SUGGESTED_QUESTIONS = [
  "Hva koster abonnementene?",
  "Hvordan booker jeg en PT?",
  "Hva er 3D-muskelvisualisering?",
  "Hvordan blir jeg verifisert PT?",
];

/**
 * Find the best matching answer for the user's query.
 * Uses keyword overlap scoring — each matching keyword contributes
 * to the score, and the QA pair with the highest score wins.
 */
export function findAnswer(query: string): string {
  const normalized = query.toLowerCase().trim();

  let bestScore = 0;
  let bestAnswer = "";

  for (const qa of knowledgeBase) {
    let score = 0;
    for (const kw of qa.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword = stronger signal
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = qa.answer;
    }
  }

  return bestScore > 0 ? bestAnswer : FALLBACK_RESPONSE;
}

/**
 * Simulates a typing delay to make the bot feel more natural.
 * Returns a promise that resolves after a random delay (800–2000ms).
 */
export function simulateTypingDelay(): Promise<void> {
  const delay = 800 + Math.random() * 1200;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
