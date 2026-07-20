/**
 * Kitozon AI Assistant — local keyword-matching knowledge base.
 * No external API needed. Supports both Norwegian and English queries.
 */

interface QAPair {
  keywords: string[];
  answer: string;
}

const knowledgeBase: QAPair[] = [
  {
    keywords: [
      "kitoslight", "hva er kitoslight", "what is kitoslight",
      "kito", "kitos", "environmental monitoring", "miljøovervåking",
      "overvåking",
    ],
    answer:
      "**Kitoslight** er Kitozons sanntids miljøovervåkingssystem. Det består av smarte benker, busskur og sensorstolper som måler luftkvalitet (CO₂, SO₂, H₂S, CO, NO₂, PM2.5), sporer energiproduksjon fra solcellepaneler, og tilbyr offentlige tjenester som telefonlading og WiFi. Alle data visualiseres på et interaktivt kart i sanntid. Kitoslight er tilgjengelig i Norge og i DRC Kongo for vulkangass-måling.",
  },
  {
    keywords: [
      "zongosol", "hva er zongosol", "what is zongosol",
      "container", "containerbolig", "container home", "containerhus",
      "zongo", "zong",
    ],
    answer:
      "**Zongosol** er Kitozons containerbolig-designverktøy. Du kan skreddersy interiør og eksteriør på din containerbolig: velg romløsninger, vinduer, dører, materialer og solcellepanel-integrasjon. Når designet er klart, kan du bestille det ferdige containerhuset direkte fra plattformen. Alt i ett verktøy — design, visualiser og bestill.",
  },
  {
    keywords: [
      "pris", "pricing", "koster", "kostnad", "abonnement", "subscription",
      "price", "cost", "hva koster", "priser", "tiers", "planer", "plans",
      "måned", "month", "nok",
    ],
    answer:
      "Kitozon har **tre produkter** med fleksible betalingsalternativer:\n\n" +
      " **Kitoslight** — Miljøovervåking\n" +
      "   • Engangsbetaling: 4 449 kr (konsulent kobles på etter kjøp)\n" +
      "   • Månedlig: 1 499 kr/md (konsulent følger deg hele veien)\n" +
      "   • Årlig: 15 290 kr/år — spar 15% — (konsulent følger deg hele veien)\n\n" +
      " **Zongosol** — Containerbolig-design (mest populær)\n" +
      "   • Engangsbetaling: 7 449 kr (konsulent kobles på etter kjøp)\n" +
      "   • Månedlig: 2 499 kr/md (konsulent følger deg hele veien)\n" +
      "   • Årlig: 25 490 kr/år — spar 15% — (konsulent følger deg hele veien)\n\n" +
      " **Dashboard** — Admin-dashbord\n" +
      "   • Månedlig: 4 999 kr/md (konsulent følger deg hele veien)\n\n" +
      "Alle abonnementer betales via Stripe. Gå til /pricing for full oversikt!",
  },
  {
    keywords: [
      "esg", "rapportering", "report", "reporting", "esg-rapport",
      "esg rapport", "bærekraft", "sustainability", "co2 rapport",
      "climate", "klima",
    ],
    answer:
      "**ESG-rapportering** gjøres via Kitozons admin-dashbord. Alle Kitoslight-enheter kobles til dashbordet via IP-adresse, og sanntidsdata om CO₂-utslipp, energiproduksjon og luftkvalitet mates automatisk inn i ESG-rapportene. Du kan generere ferdige rapporter med ett klikk — perfekt for bedrifter med rapporteringskrav. Dashboard-abonnementet (990 NOK/mnd) gir full tilgang til ESG-funksjonaliteten.",
  },
  {
    keywords: [
      "gass", "gasser", "måler", "sensor", "co2", "so2", "h2s", "no2",
      "pm2.5", "co", "luftkvalitet", "air quality", "forurensning",
      "pollution", "hvilke gasser", "what gases", "måling",
    ],
    answer:
      "Kitoslight måler følgende gasser og partikler:\n\n" +
      "• **CO₂** — karbondioksid\n" +
      "• **SO₂** — svoveldioksid\n" +
      "• **H₂S** — hydrogensulfid\n" +
      "• **CO** — karbonmonoksid\n" +
      "• **NO₂** — nitrogendioksid\n" +
      "• **PM2.5** — fine svevestøvpartikler\n\n" +
      "I DRC Kongo brukes sensorene spesielt til overvåking av vulkanske gasser. All data er tilgjengelig i sanntid via Kitoslight-abonnementet.",
  },
  {
    keywords: [
      "design", "hvordan designer", "lage", "bygg", "bygge", "containerhus",
      "designer jeg", "how do i design", "create", "build", "lag",
      "skreddersy", "customize",
    ],
    answer:
      "Slik designer du et containerhus med Zongosol:\n\n" +
      "1. Gå til **Zongosol**-siden på Kitozon\n" +
      "2. Velg en basismodell (20-fot, 40-fot, eller multi-container)\n" +
      "3. Skreddersy interiøret: romløsninger, kjøkken, bad, soverom\n" +
      "4. Velg eksteriør: vinduer, dører, terrasse, farge\n" +
      "5. Planlegg solcellepanel-integrasjon\n" +
      "6. Gå gjennom designet og bestill\n\n" +
      "Du trenger Zongosol-abonnementet (fra 2 499 kr/mnd) for full tilgang til designverktøyet.",
  },
  {
    keywords: [
      "installer", "app", "pwa", "mobil", "phone", "installere",
      "nedlasting", "download", "home screen", "add to home",
      "home screen", "homescreen", "app store", "google play",
    ],
    answer:
      "Kitozon er en **PWA** (Progressive Web App) — du trenger ikke laste ned fra App Store eller Google Play!\n\n" +
      "Slik installerer du:\n" +
      " **iPhone/iPad**: Åpne Kitozon i Safari, trykk på del-ikonet (), og velg «Add to Home Screen».\n" +
      " **Android**: Åpne Kitozon i Chrome, trykk på menyen (⋮), og velg «Add to Home Screen».\n" +
      " **Desktop**: Åpne Kitozon i Chrome/Edge, og trykk på installasjonsikonet i adressefeltet.\n\n" +
      "Appen fungerer offline og gir deg rask tilgang til alle Kitozon-funksjoner.",
  },
  {
    keywords: [
      "hvor", "tilgjengelig", "location", "available", "norge",
      "congo", "drc", "kongo", "land", "countries", "steder",
    ],
    answer:
      "Kitoslight er for tiden tilgjengelig i:\n\n" +
      " **Norge** — byer og kommuner med smarte benker, busskur og sensorstolper for miljøovervåking.\n" +
      " **DRC Kongo** — spesialtilpasset for vulkangass-måling i nærheten av aktive vulkaner.\n\n" +
      "Vi utvider fortløpende til nye markeder. Kontakt oss for å bli en pilotkunde i ditt område!",
  },
  {
    keywords: [
      "dashboard", "admin", "admin-dashbord", "administrator",
      "dashbord", "admin panel", "kontrollpanel", "hva er dashboard",
      "what is dashboard",
    ],
    answer:
      "**Admin-dashbordet** er Kitozons sentrale kontrollpanel (4 999 kr/mnd). Det gir deg:\n\n" +
      "• **Full enhetsoversikt** — alle Kitoslight-enheter koblet via IP-adresse\n" +
      "• **Sanntidsdata** — CO₂, gasser, energiproduksjon, ladestatus\n" +
      "• **ESG-rapportgenerering** — automatiske bærekraftsrapporter\n" +
      "• **Brukeradministrasjon** — administrer teammedlemmer og tilganger\n" +
      "• **Abonnementskontroll** — oppgrader, nedgrader eller endre abonnementer\n\n" +
      "Perfekt for kommuner og bedrifter som trenger full kontroll over sine miljødata.",
  },
  {
    keywords: [
      "subscribe", "subscribing", "how do i subscribe", "betaling",
      "payment", "stripe", "kjøp", "buy", "purchase", "abonnere",
      "hvordan abonnerer", "bli kunde", "sign up", "registrere",
    ],
    answer:
      "Slik abonnerer du på Kitozon:\n\n" +
      "1. Gå til **landingssiden** og scroll ned til abonnements-seksjonen\n" +
      "2. Velg abonnementet som passer deg: Kitoslight, Zongosol, eller Dashboard\n" +
      "3. Klikk på «Subscribe»-knappen — du blir sendt til **Stripe** for sikker betaling\n" +
      "4. Etter betaling får du umiddelbar tilgang til alle funksjoner i ditt abonnement\n\n" +
      "Du kan når som helst oppgradere eller avslutte abonnementet ditt via kontosiden.",
  },
  {
    keywords: [
      "benker", "benk", "bench", "smart bench", "smarte benker",
      "busskur", "bus shelter", "stolper", "poles", "sensorstolpe",
      "devices", "enheter", "device",
    ],
    answer:
      "Kitoslight består av tre typer enheter:\n\n" +
      " **Smarte benker** — med solcellepanel, telefonlading (USB + trådløs), WiFi-sone, og integrerte miljøsensorer.\n" +
      " **Busskur** — utvidet versjon med EV-lading for elbiler, større solcellepanel, og full miljøovervåking.\n" +
      " **Sensorstolper** — kompakte enheter for gassmåling og luftkvalitetsovervåking, inkludert vulkangass-måling i DRC Kongo.\n\n" +
      "Alle enheter kobles til admin-dashbordet via IP-adresse for sanntidsdata.",
  },
];

/** Welcome message shown on first open */
export const WELCOME_MESSAGE =
  "Hei!  Jeg er Hilde, Kitozons AI-assistent. Jeg kan svare på alt om Kitoslight, Zongosol og Dashboard — spør meg om priser, enheter, gassmåling eller hvordan du designer et containerhus!";

/** Fallback when no keyword match is found */
export const FALLBACK_RESPONSE =
  "Hei, jeg er Hilde!  Jeg kan hjelpe deg med spørsmål om Kitoslight, Zongosol og Dashboard. Du kan for eksempel spørre om priser, gassmåling, containerhus-design, ESG-rapportering, eller hvordan du installerer appen. Hva lurer du på? ";

/** Suggested questions shown as clickable chips */
export const SUGGESTED_QUESTIONS = [
  "Hva koster abonnementene?",
  "Hvilke gasser måler Kitoslight?",
  "Hvordan designer jeg et hus?",
  "Hvordan fungerer ESG?",
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
