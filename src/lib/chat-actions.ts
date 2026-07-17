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
  "Canada": ["canada", "canadian", "kanadisk", "toronto", "vancouver", "montreal"],
  "Australia": ["australia", "australian", "australiask", "sydney", "melbourne", "brisbane"],
  "Brasil": ["brasil", "brazil", "brasiliansk", "brazilian", "são paulo", "rio"],
  "Japan": ["japan", "japanese", "japansk", "tokyo", "osaka"],
  "India": ["india", "indian", "indisk", "mumbai", "delhi", "bangalore"],
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  "weight_loss": ["gå ned i vekt", "vektnedgang", "slanking", "slanke", "lose weight", "weight loss", "gå ned", "slank", "slimming", "weightloss", "slim", "fettforbrenning", "forbrenne fett", "burn fat", "kaloriunderskudd", "calorie deficit", "ned i vekt", "lettere"],
  "muscle_gain": ["bygge muskler", "muskelbygging", "gain weight", "muscle gain", "bulk", "bygge", "muskler", "gain muscle", "build muscle", "muscle", "hypertrofi", "hypertrophy", "større muskler", "bigger muscles", "muskelvekst"],
  "cardio": ["kondisjon", "cardio", "utholdenhet", "løping", "running", "endurance", "kondis", "stamina", "jogging", "løpe", "sykle", "sykling", "cycling", "svømming", "swimming", "intervall", "interval", "puls", "heart rate"],
  "strength": ["styrke", "strength", "styrketrening", "powerlifting", "power", "løfte tungt", "tungt", "styrkeløft", "vektløfting", "weightlifting", "sterkere", "bli sterk", "get stronger", "maksstyrke"],
  "flexibility": ["fleksibilitet", "flexibility", "tøye", "tøyning", "stretching", "yoga", "bevegelighet", "mobility", "smidighet"],
  "general": ["generell", "generelt", "general", "allround", "komme i form", "get fit", "fitness", "trening", "exercise", "helse", "health", "form"],
};

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE BASE — every topic the chatbot can handle
// ═══════════════════════════════════════════════════════════

// ── Platform Features (detailed) ─────────────────────────
const PLATFORM_RESPONSES: Record<string, string> = {
  pricing: "**Flexora Fitnes \u2013 Priser og Abonnementer \💙**\n\nVi tilbyr tre abonnementsniv\u00E5er for kunder:\n\n**Basis \u2013 149 kr/mnd** \🏠\n\u2705 Treningsplaner, chat, ranking, matskanning, musikk, konkurranser\n\u2705 Tilgang til global rangering\n\u2705 Delta i globale konkurranser\n\n**Hybrid \u2013 249 kr/mnd** \u26A1 (Mest popul\u00E6r!)\n\u2705 Alt i Basis + AI-PT, opprett grupper, arranger konkurranser\n\u2705 AI-drevet personlig trener som tilpasser planen din\n\u2705 Lag treningsgrupper med venner\n\n**Premium \u2013 399 kr/mnd** \👑\n\u2705 Alt i Hybrid + live video, bevegelseskorreksjon, pustem\u00E5ling, 1:1 PT-timer\n\u2705 AI analyserer bevegelsene dine i sanntid\n\u2705 Stemmeveiledning under trening\n\n**For PT-er: 199 kr/mnd** \🎯\n\u2705 Profil, markedsf\u00F8ring, speed date, tilgang til global kundebase\n\n\📌 Plattformen tar 10\u201315 % provisjon per booket PT-time.\n\📌 **1 m\u00E5ned gratis pr\u00F8veperiode** p\u00E5 alle abonnement!\n\nVil du vite mer om et spesifikt abonnement?",

  trial: "**Pr\u00F8veperioden hos Flexora Fitnes \🎁**\n\nVi tilbyr **1 m\u00E5neds gratis pr\u00F8veperiode** p\u00E5 alle v\u00E5re abonnementer!\n\n\u2705 Ingen bindingstid\n\u2705 Full tilgang til alle funksjoner i valgt plan\n\u2705 Du kan n\u00E5r som helst oppgradere eller avslutte\n\u2705 Ingen skjulte kostnader\n\nEtter pr\u00F8veperioden fornyes abonnementet automatisk til valgt plan. Du f\u00E5r en p\u00E5minnelse f\u00F8r pr\u00F8veperioden utl\u00F8per, s\u00E5 du har full kontroll.\n\nKlar til \u00E5 komme i gang? Registrer deg n\u00E5! \🚀",

  booking: "**Slik booker du en PT-time \📅**\n\n1. **Finn en PT** \u2013 Bla gjennom v\u00E5re verifiserte PT-er, filtrer p\u00E5 land, m\u00E5l eller spesialitet\n2. **Speed Date** \u2013 Match med PT-er gjennom v\u00E5r \"speed date\"-funksjon for \u00E5 finne den perfekte matchen\n3. **Velg tid** \u2013 Se PT-ens tilgjengelige tider og velg det som passer deg\n4. **Bekreft** \u2013 Betaling og bekreftelse skjer via plattformen\n5. **M\u00F8t opp** \u2013 Delta p\u00E5 live video-\u00F8kten med bevegelseskorreksjon!\n\n**Avbestilling:**\n\📌 24+ timer f\u00F8r: 100 % refusjon\n\📌 12-24 timer f\u00F8r: 50 % refusjon\n\📌 Under 12 timer: ingen refusjon\n\nAlle PT-er er profesjonelle, verifiserte trenere med dokumentert utdanning. \u2705",

  "speed-date": "**Speed Date \u2013 Finn din perfekte PT-match \💘**\n\nSpeed Date er v\u00E5r innovative matchefunksjon som hjelper deg \u00E5 finne den rette PT-en:\n\n\🎯 **Slik fungerer det:**\n1. PT-er setter opp ledige tider for korte introduksjonssamtaler (10-15 min)\n2. Du blar gjennom tilgjengelige PT-er og velger de som ser interessante ut\n3. Book en rask videosamtale for \u00E5 bli kjent\n4. Etter samtalen kan du velge \u00E5 booke en full time\n\n\u2728 **Hvorfor Speed Date?**\n- Spar tid \u2013 m\u00F8t flere PT-er raskt\n- Finn riktig match \u2013 personlig kjemi teller!\n- Gratis for kunder med aktivt abonnement\n\nKlar for \u00E5 finne din PT-match? G\u00E5 til Finn PT i menyen!",

  competitions: "**Konkurranser og Ranking \🏆**\n\nFlexora Fitnes har et globalt rangeringssystem og konkurranser:\n\n\🏅 **Typer konkurranser:**\n- Repetisjoner: Flest reps vinner\n- Varighet: Mest treningstid\n- Konsistens: Beste streak (flest dager p\u00E5 rad)\n- Vekttap: St\u00F8rst fremgang i prosent\n- Styrke: Tyngste l\u00F8ft i forhold til kroppsvekt\n\n\🌍 **Global og landsspesifikk:**\n- Delta i globale konkurranser eller konkurrer med ditt eget land\n- Premier inkluderer gavekort, premium-medlemskap og trof\u00E9er\n\n\📊 **Ranking:**\n- Tjen poeng for hver fullf\u00F8rte trenings\u00F8kt\n- Poeng basert p\u00E5 varighet, intensitet og konsistens\n- Klatre p\u00E5 den globale ledertavlen\n\n\📅 **Nye konkurranser** lanseres hver m\u00E5ned! Sjekk Konkurranser-siden.",

  features: "**Flexora Fitnes Funksjoner \🚀**\n\nV\u00E5r plattform tilbyr en komplett treningsreise:\n\n\🎯 **3D Muskelvisualisering** \u2013 Se n\u00F8yaktig hvilke muskler du trener i sanntid med v\u00E5rt avanserte 3D-kroppskart\n\📹 **Live Video med Bevegelseskorreksjon** \u2013 AI analyserer formen din i sanntid og gir tilbakemelding\n\🎤 **Stemmeveiledning** \u2013 F\u00E5 instruksjoner mens du trener, h\u00E5ndfri\n\🪱 **Pustem\u00E5ling** \u2013 Optimaliser pusten under \u00F8ktene for bedre utholdenhet\n\🎨 **Fargekodet Innsats** \u2013 Gr\u00F8nn/Gul/R\u00F8d for \u00E5 m\u00E5le intensitet\n\u23F1\uFE0F **Automatisk Timer** \u2013 Perfekt timing mellom sett, ingen manuell tasting\n\📸 **Matskanning** \u2013 Skann maten for umiddelbar n\u00E6ringsdata og makroer\n\🎵 **Musikk-integrasjon** \u2013 Tren med din egen musikk, tempotilpassede spillelister\n\🏆 **Global Ranking** \u2013 Konkurrer med brukere over hele verden\n\👥 **Grupper** \u2013 Tren sammen med venner (Hybrid+)\n\nSp\u00F8r meg gjerne om detaljer om noen av funksjonene!",

  "3d-muscle": "**3D Muskelvisualisering \🎯**\n\nV\u00E5r 3D-muskelvisualisering er en avansert funksjon som viser deg:\n\n\🦴 **Sanntids muskelkart** \u2013 En interaktiv 3D-modell av menneskekroppen\n\🎯 **Muskelaktivering** \u2013 Se n\u00F8yaktig hvilke muskler som aktiveres i hver \u00F8velse\n\📊 **Aktiveringsniv\u00E5** \u2013 Fargekodet intensitet for hver muskelgruppe\n\🔄 **Rot\u00E9r og zoom** \u2013 Utforsk kroppen fra alle vinkler\n\n**Slik bruker du den:**\n1. Velg en \u00F8velse fra biblioteket\n2. 3D-modellen viser hvilke muskler som jobber\n3. Under live video ser du aktiveringen i sanntid\n\nTilgjengelig p\u00E5 ALLE abonnementer! Perfekt for \u00E5 l\u00E6re anatomi og optimalisere treningen.",

  "live-video": "**Live Video med Bevegelseskorreksjon \📹**\n\nDette er v\u00E5r mest avanserte funksjon (Premium):\n\n\🤖 **AI-drevet formanalyse** \u2013 Kameraet ditt analyserer bevegelsene dine\n\u2705 **Sanntids korreksjon** \u2013 F\u00E5 umiddelbar tilbakemelding om formen din\n\🎯 **Presis sporing** \u2013 AI-en gjenkjenner ledd og vinkler\n\u26A0\uFE0F **Skadeforebygging** \u2013 Systemet advarer mot farlige bevegelser\n\n**Slik fungerer det:**\n1. Start en live video-\u00F8kt\n2. Still deg slik at kameraet ser hele kroppen\n3. AI-en analyserer hver repetisjon\n4. Du f\u00E5r muntlig og visuell tilbakemelding\n\nKrever Premium-abonnement (399 kr/mnd).",

  "voice-guidance": "**Stemmeveiledning \🎤**\n\nTren h\u00E5ndfritt med v\u00E5r stemmeveiledning:\n\n\🗣\uFE0F **Tydelige instruksjoner** \u2013 F\u00E5 beskjed om neste \u00F8velse, antall reps og hviletid\n\🎯 **Motiverende cues** \u2013 \"3 reps igjen!\", \"Bra jobba!\", \"Gi alt!\"\n\u2699\uFE0F **Tilpassbar** \u2013 Velg stemme, spr\u00E5k og hvor ofte du vil ha tilbakemelding\n\nFungerer sammen med automatisk timer og musikk-integrasjon for en s\u00F8ml\u00F8s treningsopplevelse.\n\nTilgjengelig p\u00E5 Hybrid og Premium.",

  "breathing": "**Pustem\u00E5ling \🪱**\n\nOptimaliser pusten din under trening:\n\n\📊 **Sanntidsm\u00E5ling** \u2013 Se pustefrekvens og dybde\n\🎯 **Pusteguide** \u2013 F\u00E5 veiledning om n\u00E5r du skal puste inn/ut\n\💪 **Bedre utholdenhet** \u2013 Riktig pusteteknikk \u00F8ker ytelsen\n\🧘 **Stressmestring** \u2013 Puste\u00F8velser for restitusjon\n\nSpesielt nyttig for cardio, yoga og styrkel\u00F8ft!\n\nTilgjengelig p\u00E5 Premium (399 kr/mnd).",

  "food-scan": "**Matskanning \📸**\n\nGj\u00F8r ern\u00E6ring enkelt med v\u00E5r matskanning:\n\n\📸 **Ta bilde av maten** \u2013 AI-en gjenkjenner ingredienser automatisk\n\📊 **Makron\u00E6ringsstoffer** \u2013 F\u00E5 oversikt over protein, karbo, fett og kalorier\n\📝 **Matdagbok** \u2013 Logg alle m\u00E5ltider og f\u00F8lg med p\u00E5 inntaket\n\🎯 **M\u00E5lbasert** \u2013 Se om du treffer kalorim\u00E5lene dine\n\nSt\u00F8tter tusenvis av matvarer og retter fra hele verden. Tilgjengelig p\u00E5 ALLE abonnementer!",

  "music": "**Musikk-integrasjon \🎵**\n\nTren til din egen musikk:\n\n\🎧 **Koble til din musikkapp** \u2013 St\u00F8tter Spotify, Apple Music og flere\n\🥁 **Tempotilpasset** \u2013 Musikken matches til treningsintensiteten\n\📋 **Treningsspillelister** \u2013 Ferdige spillelister for ulike treningsformer\n\u26A1 **Beat-synkronisert timer** \u2013 Hvileperioder f\u00F8lger musikken\n\nTilgjengelig p\u00E5 ALLE abonnementer!",

  groups: "**Treningsgrupper \👥**\n\nTren sammen, selv p\u00E5 avstand:\n\n\👥 **Lag grupper** \u2013 Inviter venner eller treningspartnere\n\🏆 **Gruppekonkurranser** \u2013 Utfordre hverandre internt i gruppen\n\💬 **Gruppechat** \u2013 Del fremgang, tips og motivasjon\n\📊 **Gruppeledertavle** \u2013 Se hvem som trener mest\n\nTilgjengelig p\u00E5 Hybrid (249 kr/mnd) og Premium (399 kr/mnd).",

  general: "**Velkommen til Flexora Fitnes! \💙**\n\nFlexora Fitnes er en **global, tosidig PT-markedsplass og AI-drevet treningsplattform**.\n\nFor **kunder** tilbyr vi en komplett treningsreise med 3D-muskelvisualisering, live video med bevegelseskorreksjon, stemmeveiledning, pustem\u00E5ling, matskanning, musikk-integrasjon, og mulighet for \u00E5 booke PT-er over hele verden.\n\nFor **PT-er** tilbyr vi en plattform for \u00E5 markedsf\u00F8re seg globalt, booke kunder, og bygge sin virksomhet \u2014 med speed date-matching, profesjonell profil, og tilgang til en global kundebase.\n\n\💬 **Hva kan jeg hjelpe deg med?**\n- Finn en PT i ditt omr\u00E5de\n- Informasjon om priser og abonnementer\n- Hvordan plattformen fungerer\n- Treningstips og r\u00E5d\n- Anbefalinger basert p\u00E5 dine m\u00E5l\n\nBare sp\u00F8r! \😊",

  registration: "**Slik registrerer du deg \📝**\n\n1. G\u00E5 til **Registrer deg**-siden\n2. Velg om du er **Kunde** eller **PT**\n3. Fyll inn navn, e-post, passord, land og f\u00F8dselsdato\n4. Velg abonnement (Basis, Hybrid eller Premium)\n\n**For PT-er:**\nDu m\u00E5 i tillegg oppgi:\n- Sertifiseringsinformasjon (NASM, ISSA, etc.)\n- Laste opp diplom/sertifikat\n- \u00C5rs erfaring\n- Utdanningssted\n- Bio om din treningsfilosofi\n\nEtter registrering f\u00E5r du 1 m\u00E5ned gratis pr\u00F8veperiode! \🎁",

  "how-it-works": "**Slik fungerer Flexora Fitnes \🔄**\n\nFlexora er bygget for \u00E5 gi deg en komplett treningsreise:\n\n1. **Registrer deg** \u2013 Opprett konto som kunde eller PT\n2. **Velg abonnement** \u2013 Start med 1 m\u00E5ned gratis pr\u00F8veperiode\n3. **Sett m\u00E5l** \u2013 Fortell oss hva du vil oppn\u00E5 (vekttap, muskler, kondisjon, styrke)\n4. **F\u00E5 en plan** \u2013 AI-PT lager en personlig treningsplan for deg\n5. **Tren** \u2013 Bruk 3D-visualisering, stemmeveiledning og automatisk timer\n6. **Spor fremgang** \u2013 F\u00F8lg med p\u00E5 ranking, konkurranser og statistikk\n7. **Book PT** \u2013 Ved behov, finn og book en verifisert PT\n\nAlt er integrert i \u00E9n plattform \u2014 ingen flere apper \u00E5 sjonglere!",
};

// ── Site content index (scraped from landing page) ──────
const SITE_CONTENT: Record<string, string> = {
  "flexora": "Flexora Fitnes er verdens f\u00F8rste tosidige PT-markedsplass \u2014 en AI-drevet treningsplattform som kombinerer avansert teknologi med global personlig trening.",
  "pt-markedsplass": "Flexora er en global markedsplass der verifiserte PT-er kan markedsf\u00F8re seg til kunder over hele verden, og kunder kan finne og booke profesjonelle trenere basert p\u00E5 land, m\u00E5l og spesialitet.",
  "verifiserte pt": "Alle PT-er p\u00E5 Flexora er verifiserte profesjonelle med dokumentert utdanning. Kun ekte, kvalifiserte trenere f\u00E5r bli med \u2014 dette beskytter b\u00E5de kunder og PT-ers omd\u00F8mme.",
  "tosidig": "Flexora er en tosidig plattform: \u00E9n side for kunder som vil trene smartere med AI, og \u00E9n side for PT-er som vil utvide kundebasen globalt.",
  "kunde": "For kunder tilbyr Flexora en komplett treningsreise: 3D-muskelvisualisering, live video med bevegelseskorreksjon, stemmeveiledning, pustem\u00E5ling, fargekodet innsats, automatisk timer, matskanning, musikk-integrasjon, ranking og globale konkurranser.",
  "pt": "For PT-er tilbyr Flexora: profesjonell profil, global markedsf\u00F8ring, speed date-matching med kunder, full tilgang til global kundebase, og booking- og planleggingsverkt\u00F8y. Kun verifiserte profesjonelle.",
  "ai": "Flexora bruker kunstig intelligens til: bevegelseskorreksjon via kamera, stemmeveiledning, pustem\u00E5ling, matgjenkjenning, personlige treningsplaner (AI-PT), og smart matching mellom PT og kunde.",
  "global": "Flexora er en global plattform \u2014 kunder og PT-er kan koble seg p\u00E5 tvers av landegrenser. St\u00F8tter norsk, engelsk, spansk, fransk, tysk, arabisk og kinesisk.",
};

// ── Training Knowledge Base ──────────────────────────────
const TRAINING_RESPONSES: Record<string, string> = {
  weight_loss: "**Vekttap \u2013 Din guide til effektiv fettforbrenning \🏃**\n\n**Grunnprinsippet:**\nFor \u00E5 g\u00E5 ned i vekt m\u00E5 du ha et kaloriunderskudd \u2014 du m\u00E5 forbrenne mer enn du spiser. Men det handler om mer enn bare kalorier!\n\n**Anbefalt trening for vekttap:**\n\🏃 **Cardio 3-5 ganger i uken** \u2014 30-60 minutter per \u00F8kt\n  - G\u00E5ing/jogging, sykling, sv\u00F8mming, intervalltrening (HIIT)\n\🏋\uFE0F **Styrketrening 2-3 ganger i uken** \u2014 \u00D8ker hvilestoffskiftet\n  - Fokus p\u00E5 store muskelgrupper (bein, rygg, bryst)\n\🧘 **Aktiv restitusjon** \u2014 Yoga, t\u00F8ying, g\u00E5turer\n\n**Kostholdstips:**\n- Spis proteinrikt (kylling, fisk, egg, b\u00F8nner) for \u00E5 bevare muskler\n- Reduser sukker og prosessert mat\n- Drikk mye vann (minst 2 liter daglig)\n- Spis regelmessige m\u00E5ltider\n\n**Flexora-verkt\u00F8y for vekttap:**\n\📸 Matskanning for \u00E5 tracke kalorier\n\🏆 Delta i vekttap-konkurranser\n\📊 AI-PT lager en personlig vekttapsplan\n\💪 3D-visualisering for \u00E5 se muskler under fettet\n\nHusk: sunt vekttap er 0.5-1 kg per uke. Raske dietter gir ofte jojo-effekt!",

  muscle_gain: "**Muskelbygging \u2013 Bygg styrke og st\u00F8rrelse \💪**\n\n**Grunnprinsippet:**\nFor \u00E5 bygge muskler trenger du progressiv overload \u2014 du m\u00E5 gradvis \u00F8ke belastningen over tid. Kroppen tilpasser seg, og du m\u00E5 fortsette \u00E5 utfordre den.\n\n**Anbefalt trening for muskelbygging:**\n\🏋\uFE0F **Styrketrening 3-5 ganger i uken** \u2014 45-90 minutter per \u00F8kt\n  - Fokus p\u00E5 sammensatte \u00F8velser: kneb\u00F8y, markl\u00F8ft, benkpress, roing\n  - 8-12 repetisjoner per sett for hypertrofi\n  - 3-4 sett per \u00F8velse\n  - 60-90 sekunder hvile mellom sett\n\n**Kostholdstips:**\n- Kalorioverskudd p\u00E5 200-500 kcal over vedlikehold\n- Protein: 1.6-2.2g per kg kroppsvekt daglig\n- Spis nok karbohydrater for energi til trening\n- Timing: spis protein f\u00F8r og etter trening\n\n**Flexora-verkt\u00F8y for muskelbygging:**\n\🎯 3D-muskelvisualisering for \u00E5 se hvilke muskler du trener\n\📹 Bevegelseskorreksjon for perfekt teknikk\n\u23F1\uFE0F Automatisk timer for optimale hvileperioder\n\🏆 Delta i styrkekonkurranser\n\nHusk: muskler bygges under hvile, ikke under trening. S\u00F8rg for 7-9 timer s\u00F8vn!",

  cardio: "**Kondisjonstrening \u2013 Bygg utholdenhet \u2764\uFE0F**\n\n**Grunnprinsippet:**\nKondisjonstrening styrker hjerte og lunger, \u00F8ker utholdenheten og forbrenner kalorier. Regelmessig cardio reduserer risiko for hjerte- og karsykdommer.\n\n**Typer kondisjonstrening:**\n\🏃 **LISS (Low Intensity Steady State)** \u2014 Rolig, langvarig trening\n  - G\u00E5ing, jogging, sykling i moderat tempo\n  - 30-90 minutter, 2-4 ganger i uken\n  - Bygger grunnleggende utholdenhet\n\n\u26A1 **HIIT (High Intensity Interval Training)** \u2014 Korte, intense intervaller\n  - 20-30 sekunder max innsats, 10-20 sekunder hvile\n  - 10-20 minutter totalt, 1-2 ganger i uken\n  - Sv\u00E6rt effektivt for fettforbrenning\n\n\🏊 **Blandet cardio** \u2014 Varier mellom aktiviteter\n  - L\u00F8ping, sykling, sv\u00F8mming, roing, trappemaskin\n  - Holder treningen variert og morsom\n\n**Flexora-verkt\u00F8y for cardio:**\n\🪱 Pustem\u00E5ling for \u00E5 optimalisere pusteteknikk\n\🎨 Fargekodet innsats for \u00E5 holde rett intensitet\n\🎵 Musikk-integrasjon med tempotilpassede spillelister\n\🏆 Delta i utholdenhetskonkurranser\n\nAnbefalt: 150 minutter moderat cardio eller 75 minutter h\u00F8yintensiv cardio per uke!",

  strength: "**Styrketrening \u2013 Bli sterkere \🏋\uFE0F**\n\n**Grunnprinsippet:**\nStyrketrening handler om \u00E5 \u00F8ke muskelstyrken gjennom progressiv overload. Du blir sterkere ved \u00E5 l\u00F8fte tyngre vekter over tid, ikke ved \u00E5 ta flere repetisjoner med lette vekter.\n\n**Anbefalt trening for styrke:**\n\🏋\uFE0F **Fokus p\u00E5 basis\u00F8velser:**\n  - Kneb\u00F8y (bein, kjerne)\n  - Markl\u00F8ft (rygg, bein, grep)\n  - Benkpress (bryst, skuldre, triceps)\n  - Milit\u00E6rpress (skuldre)\n  - Roing (rygg, biceps)\n\n\📊 **Programstruktur:**\n  - 3-5 repetisjoner per sett for maks styrke\n  - 4-5 sett per \u00F8velse\n  - 2-3 minutters hvile mellom tunge sett\n  - Tren 3-4 ganger i uken\n\n**Kostholdstips for styrke:**\n- Tilstrekkelig protein (1.6-2.0g per kg kroppsvekt)\n- Nok kalorier for restitusjon\n- Kreatin kan gi 5-10% styrke\u00F8kning (valgfritt)\n\n**Flexora-verkt\u00F8y for styrketrening:**\n\📹 Bevegelseskorreksjon for perfekt teknikk (viktig ved tunge l\u00F8ft!)\n\🎯 3D-visualisering for \u00E5 se muskelaktivering\n\u23F1\uFE0F Automatisk timer med lange hvileperioder\n\nHusk: teknikk f\u00F8r vekt! D\u00E5rlig teknikk med tung vekt f\u00F8rer til skader.",

  nutrition: "**Ern\u00E6ring \u2013 Drivstoff for kroppen \🥗**\n\n**Makron\u00E6ringsstoffer:**\n\🍗 **Protein** \u2014 Bygger og reparerer muskler (4 kcal/g)\n  - Kilder: kylling, fisk, egg, b\u00F8nner, tofu, proteinpulver\n  - Anbefalt: 1.6-2.2g per kg kroppsvekt ved trening\n\n\🍚 **Karbohydrater** \u2014 Kroppens prim\u00E6re energikilde (4 kcal/g)\n  - Kilder: ris, pasta, poteter, havregryn, frukt, gr\u00F8nnsaker\n  - Fyll p\u00E5 f\u00F8r og etter trening for best ytelse\n\n\🫑 **Fett** \u2014 Viktig for hormoner og vitaminer (9 kcal/g)\n  - Kilder: olivenolje, n\u00F8tter, avokado, fet fisk\n  - Anbefalt: 20-35% av daglige kalorier\n\n**M\u00E5ltidstiming:**\n- F\u00F8r trening: karbohydrater + litt protein (1-3 timer f\u00F8r)\n- Etter trening: protein + karbohydrater (innen 2 timer)\n- Spis regelmessig gjennom dagen\n\n**Flexora sin matskanning:**\n\📸 Ta bilde av maten din for umiddelbar n\u00E6ringsanalyse\n\📊 F\u00E5 oversikt over kalorier, protein, karbo og fett\n\🎯 Se om du treffer m\u00E5lene dine\n\nHusk: et balansert kosthold er viktigere enn perfekt timing!",

  recovery: "**Restitusjon \u2013 Kroppens hemmelige v\u00E5pen \😴**\n\nRestitusjon er like viktig som trening! Her er hvorfor og hvordan:\n\n**Hvorfor restitusjon er viktig:**\n\💪 Muskler bygges under hvile, ikke under trening\n\🧠 Nervesystemet trenger tid til \u00E5 restituere\n\u26A0\uFE0F Overtrening \u00F8ker skaderisiko og reduserer fremgang\n\n**Anbefalt restitusjon:**\n\😴 **S\u00F8vn** \u2014 7-9 timer per natt\n  - Viktigste restitusjonsverkt\u00F8yet du har\n  - Veksthormon frigj\u00F8res under dyp s\u00F8vn\n\n\📅 **Hviledager** \u2014 1-2 per uke\n  - Aktiv hvile: lett g\u00E5tur, yoga, t\u00F8ying\n  - Kroppen reparerer og bygger seg sterkere\n\n\🧘 **Aktiv restitusjonsteknikk:**\n- T\u00F8ying og foam rolling\n- Yoga eller lett mobilitetstrening\n- Massasje eller varmebehandling\n\n\💧 **Hydrering og ern\u00E6ring:**\n- Drikk nok vann (2-3 liter daglig)\n- Spis nok protein for muskelreparasjon\n\n**Flexora-funksjoner for restitusjon:**\n\🪱 Pustem\u00E5ling kan brukes til avspennings\u00F8velser\n\📊 Track hviledager i treningsloggen",

  beginner: "**Nybegynnerguide \u2013 Kom i gang med trening \🌱**\n\nGratulerer med at du vil starte! Her er en enkel plan:\n\n**F\u00F8rste steg:**\n\🎯 **Sett realistiske m\u00E5l** \u2014 Vil du ned i vekt? Bygge muskler? Bedre kondisjon?\n\📅 **Start med 2-3 \u00F8kter i uken** \u2014 30-45 minutter per \u00F8kt\n\📝 **Hold det enkelt** \u2014 Du trenger ikke kompliserte programmer\n\n**Anbefalt nybegynnerprogram (3 dager/uke):**\nDag 1:\n- Kneb\u00F8y (kroppsvekt): 3x10\n- Armhevinger (p\u00E5 kn\u00E6r om n\u00F8dvendig): 3x8\n- Planke: 3x20-30 sekunder\n- 15 min rask gange\n\nDag 2:\n- Utfall: 3x8 per bein\n- Roing med strikk: 3x10\n- Skulderpress med lette manualer: 3x10\n- 15 min sykling\n\nDag 3:\n- G\u00E5 30-45 minutter i raskt tempo\n- T\u00F8ying av hele kroppen, 10-15 minutter\n\n**Viktige tips for nybegynnere:**\n\u2705 Teknikk f\u00F8r vekt \u2014 l\u00E6r \u00F8velsene riktig f\u00F8rst\n\u2705 \u00D8k gradvis \u2014 ikke gj\u00F8r for mye for tidlig\n\u2705 Lytt til kroppen \u2014 smerte er et varselsignal\n\u2705 V\u00E6r t\u00E5lmodig \u2014 resultater tar tid\n\nMed Flexora f\u00E5r du AI-PT som lager et personlig nybegynnerprogram! \🚀",

  intermediate: "**Viderekommen trening \u2013 Ta det til neste niv\u00E5 \📈**\n\nN\u00E5r du har trent i 3-6 m\u00E5neder og mestrer grunnleggende \u00F8velser:\n\n**Programstruktur for viderekomne:**\n\📅 **4-5 \u00F8kter per uke**\n\🔄 **Split-rutiner** \u2014 Del opp kroppen i fokusdager:\n  - Overkropp / Underkropp\n  - Push / Pull / Bein\n  - Bryst+Triceps / Rygg+Biceps / Bein+Skuldre\n\n**Progressive teknikker:**\n\📈 **Line\u00E6r progresjon** \u2014 \u00D8k vekt med 2.5kg hver uke\n\🔄 **Periodisering** \u2014 Varier intensitet over uker (tung/lett/moderat)\n\u23F1\uFE0F **Tempsotrening** \u2014 Kontroller tempo i hver repetisjon (f.eks. 3 sek ned, 1 sek opp)\n\💪 **Supersett** \u2014 To \u00F8velser uten pause mellom\n\n**Flexora for viderekomne:**\n\📹 Bevegelseskorreksjon for \u00E5 perfeksjonere teknikk\n\🎯 3D-visualisering for \u00E5 optimalisere muskelaktivering\n\🏆 Konkurranser for motivasjon og progresjon\n\👥 Gruppetrening for sosial trening\n\nTrenger du et spesifikt program? Sp\u00F8r om et m\u00E5l!",

  stretching: "**T\u00F8ying og fleksibilitet \u2013 Viktigere enn du tror \🧘**\n\n**Hvorfor t\u00F8ye?**\n\u2705 \u00D8ker bevegelighet og funksjonalitet\n\u2705 Reduserer skaderisiko\n\u2705 Bedrer restitusjon etter trening\n\u2705 Reduserer muskelspenninger og smerter\n\n**Typer t\u00F8ying:**\n\🧘 **Dynamisk t\u00F8ying** \u2014 F\u00D8R trening\n  - Bevegelser gjennom hele bevegelsesbanen\n  - Eks: beinsving, armringer, utfall med rotasjon\n  - Varighet: 5-10 minutter\n\n\😌 **Statisk t\u00F8ying** \u2014 ETTER trening\n  - Hold posisjonen i 20-30 sekunder\n  - Eks: hamstring stretch, quad stretch, skulder stretch\n  - Ikke \"sprett\" \u2014 hold rolig og pust\n\n**Anbefalt rutine:**\n- 5 min dynamisk t\u00F8ying f\u00F8r trening\n- 10 min statisk t\u00F8ying etter trening\n- 1-2 dedikerte t\u00F8ye\u00F8kter per uke (yoga, mobilitet)\n\nFlexora inkluderer t\u00F8ying i alle treningsplaner!",

  hiit: "**HIIT \u2013 H\u00F8yintensiv intervalltrening \u26A1**\n\nHIIT er en av de mest effektive treningsformene:\n\n**Hva er HIIT?**\nKorte, intense arbeidsperioder etterfulgt av korte hvileperioder. En typisk HIIT-\u00F8kt varer 10-25 minutter, men gir like stor effekt som en times moderat cardio.\n\n**Eksempel p\u00E5 HIIT-\u00F8kt (15 min):**\n\u23F1\uFE0F 30 sek arbeid / 15 sek hvile \u2014 gjenta 8 runder per \u00F8velse, 1 min pause mellom \u00F8velser:\n\n1. Burpees\n2. Mountain climbers\n3. Jump squats\n4. High knees\n\n**Fordeler med HIIT:**\n\🔥 Forbrenner kalorier i opptil 24 timer etter \u00F8kt\n\u2764\uFE0F Forbedrer kondisjon raskt\n\u23F0 Tidsbesparende\n\💪 Bevarer muskelmasse bedre enn lang cardio\n\n**Flexora-verkt\u00F8y for HIIT:**\n\u23F1\uFE0F Automatisk timer for intervaller\n\🎨 Fargekodet innsats (du b\u00F8r v\u00E6re i r\u00F8d sone!)\n\🎵 Tempotilpasset musikk\n\nAnbefalt: 1-2 HIIT-\u00F8kter per uke, kombinert med styrketrening.",
};

// ── PT-related responses ─────────────────────────────────
const PT_RESPONSES: Record<string, string> = {
  "become-pt": "**Bli PT p\u00E5 Flexora \🎓**\n\nSlik blir du personlig trener p\u00E5 plattformen:\n\n1. **Registrer deg** \u2014 Velg \"Jeg er PT\" under registrering\n2. **Fyll inn profilen** \u2014 Fullt navn, land, f\u00F8dselsdato\n3. **Last opp dokumentasjon** \u2014 Diplom, sertifikat eller annen godkjent PT-utdanning\n4. **Beskriv erfaring** \u2014 Antall \u00E5r, spesialiteter, treningsfilosofi\n5. **Sett timepris** \u2014 Du bestemmer selv (plattformen tar 10-15 %)\n6. **Vent p\u00E5 verifisering** \u2014 Vi sjekker dokumentasjonen din (1-3 virkedager)\n\n**Krav:**\n\📜 Dokumentert PT-utdanning (NASM, ISSA, ACE, NIH, eller tilsvarende)\n\📋 Minimum 1 \u00E5rs erfaring anbefales\n\🌍 Du kan v\u00E6re basert hvor som helst i verden\n\n**PT-abonnement: 199 kr/mnd** \u2014 Tilgang til global kundebase, speed date, profilsynlighet.",

  "pt-pricing": "**PT-abonnement og inntjening \💰**\n\n**PT-abonnement: 199 kr/mnd**\n- Profesjonell verifisert profil\n- Global markedsf\u00F8ring og synlighet\n- Speed date-matching med kunder\n- Full tilgang til global kundebase\n- Booking- og planleggingsverkt\u00F8y\n\n**Inntektsmodell for PT-er:**\n\💵 Du setter din egen timepris (f.eks. 500 kr/time)\n\📊 Plattformen tar 10-15 % provisjon per booket time\n\💳 Utbetaling skjer m\u00E5nedlig\n\n**Eksempel p\u00E5 inntjening:**\n- Timepris: 500 kr\n- 20 bookinger per uke = 10 000 kr/uke\n- Plattformprovisjon (12.5 %): -1 250 kr\n- **Din inntekt: 8 750 kr/uke \u2248 35 000 kr/mnd**\n\nJo flere gode vurderinger du f\u00E5r, jo h\u00F8yere rangeres du \u2014 og jo flere bookinger!",

  "pt-speed-date": "**Speed Date for PT-er \💘**\n\nSpeed Date er den raskeste m\u00E5ten \u00E5 finne nye kunder:\n\n**Slik fungerer det:**\n1. Sett opp ledige tider for speed date (10-15 min per samtale)\n2. Kunder blar gjennom tilgjengelige PT-er\n3. N\u00E5r en kunde booker, starter videosamtalen automatisk\n4. Kort introduksjon \u2014 du og kunden avgj\u00F8r om dere vil booke en full time\n\n**Tips for vellykket speed date:**\n\u2705 V\u00E6r profesjonell og engasjert\n\u2705 Sp\u00F8r om kundens m\u00E5l og erfaring\n\u2705 Forklar hva som gj\u00F8r deg unik som PT\n\u2705 Foresl\u00E5 en konkret plan for kunden\n\nEtter speed date kan kunden booke deg direkte. Du f\u00E5r varsling n\u00E5r noen booker!",

  "pt-profile": "**PT-profil \u2013 Slik skiller du deg ut \📋**\n\nDin PT-profil er din viktigste markedsf\u00F8ringskanal p\u00E5 Flexora:\n\n**Profilen inneholder:**\n\📸 Profilbilde (anbefalt: profesjonelt bilde)\n\📜 Diplom og sertifiseringer (vises med verifiseringsmerke)\n\🎓 \u00C5rs erfaring og utdanningssted\n\🏷\uFE0F Spesialiteter (vekttap, styrke, rehab, etc.)\n\💬 Bio og treningsfilosofi\n\u2B50 Vurderinger fra tidligere kunder\n\💰 Timepris\n\n**Tips for en god profil:**\n- Skriv en engasjerende bio som viser personlighet\n- List opp konkrete resultater du har hjulpet kunder med\n- Bruk et smilende, profesjonelt bilde\n- Hold profilen oppdatert med nye sertifiseringer\n- Be forn\u00F8yde kunder om \u00E5 gi vurdering\n\nPT-er med komplette profiler f\u00E5r 3x flere bookinger!",

  "pt-verification": "**PT-verifisering \u2705**\n\nAlle PT-er p\u00E5 Flexora m\u00E5 verifiseres f\u00F8r de kan ta imot kunder:\n\n**Verifiseringsprosessen:**\n1. Du laster opp diplom/sertifikat under registrering\n2. Teamet v\u00E5rt gjennomg\u00E5r dokumentasjonen manuelt\n3. Vi sjekker at utdanningen er fra en godkjent institusjon\n4. Du f\u00E5r et verifiseringsmerke p\u00E5 profilen din \u2705\n5. F\u00F8rst da blir du synlig for kunder\n\n**Godkjente sertifiseringer inkluderer:**\n- NASM-CPT, NASM-CES, NASM-PES\n- ISSA-CPT\n- ACE-CPT\n- NSCA-CSCS\n- NIH-godkjente norske PT-utdanninger\n- Tilsvarende europeiske og internasjonale sertifiseringer\n\n**Hvorfor verifisering?**\n\🛡\uFE0F Beskytter kunder mot useri\u00F8se akt\u00F8rer\n\u2B50 Beskytter seri\u00F8se PT-ers omd\u00F8mme\n\🌍 Bygger tillit i den globale markedsplassen\n\nVerifisering tar vanligvis 1-3 virkedager.",

  "pt-tips": "**PT-tips \u2013 Slik lykkes du p\u00E5 Flexora \🌟**\n\n**F\u00E5 flere bookinger:**\n\📸 Profesjonelt profilbilde gir 40 % flere klikk\n\📝 Komplett bio med spesialiteter gir 3x flere bookinger\n\u2B50 Be ALLE kunder om vurdering etter fullf\u00F8rte timer\n\💬 Svar raskt p\u00E5 meldinger fra potensielle kunder\n\🎯 Bruk Speed Date aktivt for \u00E5 m\u00F8te nye kunder\n\📊 Analyser din egen statistikk og forbedre deg\n\n**Bygg et godt omd\u00F8mme:**\n- V\u00E6r presis og profesjonell\n- Tilpass treningen til hver enkelt kunde\n- F\u00F8lg opp etter \u00F8kter\n- Be om tilbakemelding og bruk den til \u00E5 forbedre deg\n- Hold deg oppdatert med videreutdanning\n\n**Markedsf\u00F8ringstips:**\n\🌍 Bruk landsspesifikke s\u00F8keord i profilen din\n\🏷\uFE0F List opp alle spesialiteter (jo flere, jo bredere treff)\n\💰 V\u00E6r konkurransedyktig p\u00E5 pris i starten, \u00F8k etter hvert som du f\u00E5r gode vurderinger",
};

// ── Greetings ────────────────────────────────────────────
const GREETING_RESPONSES = [
  "Hei! \👋 Jeg er Flexora Fitnes sin AI-assistent. Jeg kan hjelpe deg med \u00E5 finne en PT, svare p\u00E5 sp\u00F8rsm\u00E5l om plattformen, gi treningstips, eller anbefale abonnementer. Hva lurer du p\u00E5? \💙",
  "Hallo! \🎯 Velkommen til Flexora Fitnes! Jeg kan hjelpe deg med \u00E5 finne den perfekte PT-en, forklare priser, gi treningsr\u00E5d, eller fortelle om v\u00E5re funksjoner. Hva kan jeg hjelpe med?",
  "Hei hei! \😊 Jeg er her for \u00E5 hjelpe deg med alt om Flexora Fitnes \u2014 trening, PT, priser, funksjoner, du nevner det! Bare sp\u00F8r i vei.",
  "God dag! \💪 Klar for \u00E5 ta treningen til neste niv\u00E5? Jeg kan anbefale PT-er, forklare abonnementer, gi treningsr\u00E5d, eller fortelle om v\u00E5re unike funksjoner. Hva interesserer deg?",
];

// ═══════════════════════════════════════════════════════════
// SITE CONTENT SEARCH
// ═══════════════════════════════════════════════════════════

function searchSiteContent(query: string): string | null {
  const lower = query.toLowerCase();
  let bestMatch: { key: string; score: number } | null = null;

  for (const [key, content] of Object.entries(SITE_CONTENT)) {
    const keyWords = key.toLowerCase().split(/[- ]/);
    const matchCount = keyWords.filter(w => lower.includes(w)).length;
    if (matchCount > 0) {
      const score = matchCount / keyWords.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { key, score };
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.5) {
    return SITE_CONTENT[bestMatch.key];
  }

  // Also search in platform and training responses
  const allResponses = { ...PLATFORM_RESPONSES, ...TRAINING_RESPONSES, ...PT_RESPONSES };
  for (const [key, content] of Object.entries(allResponses)) {
    if (lower.includes(key.replace(/-/g, " ")) || lower.includes(key)) {
      return content;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════

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
  type: "pt_recommendation" | "pt_info" | "platform_info" | "training" | "greeting" | "general";
  params: { country?: string; goal?: string; ptName?: string; topic?: string; trainingTopic?: string };
} {
  const lower = query.toLowerCase();

  // Greeting detection
  const greetings = ["hei", "hallo", "hello", "hi", "hey", "god dag", "god kveld", "good morning", "good evening", "sup", "yo", "halla"];
  const isGreeting = greetings.some(g => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"));
  if (isGreeting && query.length < 40) {
    return { type: "greeting", params: {} };
  }

  // PT recommendation patterns (expanded)
  const ptRecPatterns = [
    "finn en pt", "finne en pt", "anbefal en pt", "anbefale en pt", "pt i ",
    "personlig trener", "personal trainer", "recommend a pt", "recommend pt",
    "find a pt", "find pt", "hvem er best", "top pt", "beste pt",
    "pt som", "trener som", "trainer who", "pt who",
    "jeg vil ha en pt", "jeg trenger en pt", "i need a pt", "i want a pt",
    "hvilken pt", "which pt", "pt for", "trener for",
    "foresl\u00E5 pt", "foresl\u00E5 en pt", "suggest a pt", "suggest pt",
    "noen pt", "noen trener", "pt anbefaling", "pt recommendation",
    "se etter pt", "look for pt", "looking for pt", "looking for a pt",
    "trenger pt", "need pt", "need a pt", "trenger personlig trener",
    "bestill pt", "book pt", "booke pt", "bestille pt",
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

  // PT info patterns (expanded)
  const ptInfoPatterns = [
    "hvem er", "who is", "top rated", "top pt", "best pt", "beste pt",
    "hvilke pt", "which pt", "pt rangering", "pt leaderboard",
    "pt med", "trener med", "spesialiserer", "specializes",
    "pt profil", "pt profile", "bli pt", "become pt", "how to become",
    "registrere som pt", "register as pt", "pt verifisering",
    "pt verification", "pt pris", "pt price", "pt l\u00F8nn", "pt income",
    "pt erfaring", "pt experience", "hvor mange pt",
    "speed date", "pt speed",
  ];
  const isPtInfo = ptInfoPatterns.some(p => lower.includes(p));
  if (isPtInfo) {
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

    // Map specific PT topics
    let ptTopic: string | undefined;
    if (lower.includes("speed date") || lower.includes("speeddate")) ptTopic = "speed-date";
    else if (lower.includes("bli pt") || lower.includes("become pt") || lower.includes("registrere som pt") || lower.includes("register as pt")) ptTopic = "become-pt";
    else if (lower.includes("pris") || lower.includes("l\u00F8nn") || lower.includes("inntekt") || lower.includes("income") || lower.includes("price")) ptTopic = "pt-pricing";
    else if (lower.includes("profil") || lower.includes("profile")) ptTopic = "pt-profile";
    else if (lower.includes("verifisering") || lower.includes("verification")) ptTopic = "pt-verification";
    else if (lower.includes("tips") || lower.includes("suksess") || lower.includes("bookinger")) ptTopic = "pt-tips";

    return {
      type: "pt_info",
      params: {
        country: detectCountry(query) || undefined,
        goal: detectGoal(query) || undefined,
        ptName,
        topic: ptTopic,
      },
    };
  }

  // Platform info patterns (massively expanded)
  const platformPatterns = [
    "pris", "price", "koster", "cost", "plan", "abonnement", "subscription",
    "pr\u00F8ve", "trial", "free", "gratis", "hvordan fungerer", "how does",
    "hva er", "what is", "hvilke funksjoner", "features", "hva kan",
    "hvordan bruke", "how to use", "hvordan registrere", "how to register",
    "hvordan booke", "how to book", "pt booking", "speed date",
    "konkurranse", "competition", "ranking", "leaderboard",
    "video", "bevegelseskorreksjon", "form correction", "stemmeveiledning",
    "voice guidance", "pustem\u00E5ling", "breath", "matskanning", "food scan",
    "musikk", "music", "3d", "muskelvisualisering", "muscle visualization",
    "flexora", "plattform", "platform", "app", "nettsted", "website",
    "registrering", "registration", "registrer", "sign up", "signup",
    "lage konto", "create account", "konto", "account",
    "gruppe", "group", "gruppetrening",
    "hvordan komme i gang", "how to start", "komme i gang",
    "hvilke spr\u00E5k", "languages", "hvilke land",
    "provisjon", "commission", "gebyr", "fee", "betaling",
    "funksjon", "funksjoner", "feature",
    "hva tilbyr", "hva har", "what does flexora", "what can flexora",
    "timer", "automatisk", "fargekodet", "color coded",
    "hva koster", "hvor mye koster", "how much",
    "basis", "hybrid", "premium",
    "kan jeg", "can i", "er det mulig", "is it possible",
    "betalingsm\u00E5te", "payment method", "faktura",
  ];
  const isPlatform = platformPatterns.some(p => lower.includes(p));
  if (isPlatform) {
    let topic = "general";
    if (lower.includes("pris") || lower.includes("price") || lower.includes("koster") || lower.includes("cost") || lower.includes("plan") || lower.includes("abonnement")) {
      topic = "pricing";
    } else if (lower.includes("pr\u00F8ve") || lower.includes("trial") || lower.includes("free") || lower.includes("gratis")) {
      topic = "trial";
    } else if (lower.includes("booke") || lower.includes("book") || lower.includes("pt booking")) {
      topic = "booking";
    } else if (lower.includes("speed date") || lower.includes("speeddate")) {
      topic = "speed-date";
    } else if (lower.includes("konkurranse") || lower.includes("competition") || lower.includes("ranking")) {
      topic = "competitions";
    } else if (lower.includes("funksjon") || lower.includes("feature") || lower.includes("kan")) {
      topic = "features";
    } else if (lower.includes("3d") || lower.includes("muskelvisualisering") || lower.includes("muscle visual")) {
      topic = "3d-muscle";
    } else if (lower.includes("video") || lower.includes("bevegelse") || lower.includes("form correct")) {
      topic = "live-video";
    } else if (lower.includes("stemme") || lower.includes("voice")) {
      topic = "voice-guidance";
    } else if (lower.includes("pust") || lower.includes("breath")) {
      topic = "breathing";
    } else if (lower.includes("mat") || lower.includes("food") || lower.includes("skann")) {
      topic = "food-scan";
    } else if (lower.includes("musikk") || lower.includes("music")) {
      topic = "music";
    } else if (lower.includes("gruppe") || lower.includes("group")) {
      topic = "groups";
    } else if (lower.includes("registr") || lower.includes("register") || lower.includes("sign up") || lower.includes("lage konto") || lower.includes("create account")) {
      topic = "registration";
    } else if (lower.includes("fungerer") || lower.includes("works") || lower.includes("komme i gang")) {
      topic = "how-it-works";
    }
    return { type: "platform_info", params: { topic } };
  }

  // Training/fitness questions (expanded — catches ALL training-related queries)
  const trainingPatterns = [
    "hvordan trene", "hvordan g\u00E5 ned", "hvordan bygge", "hvordan bli",
    "treningstips", "treningsr\u00E5d", "treningsprogram", "treningsplan",
    "trenings\u00F8velse", "\u00F8velse", "\u00F8velser", "workout", "workout plan",
    "hvor mange reps", "hvor mange sett", "hvor ofte trene",
    "hva skal jeg spise", "hva b\u00F8r jeg spise", "kosthold", "diett",
    "kalorier", "protein", "karbohydrater", "fett", "ern\u00E6ring",
    "n\u00E6ring", "macro", "makro", "m\u00E5ltid", "matplan",
    "vektnedgang", "vektreduksjon", "sunt vekttap", "slanketips",
    "muskeltrening", "muskelvekst", "hypertrofi", "bulk",
    "utholdenhet", "kondisjonstrening", "cardio program",
    "styrkeprogram", "styrketrening program", "l\u00F8fteprogram",
    "intervall", "intervalltrening", "hiit", "h\u00F8yintensiv",
    "restituere", "restitusjon", "hvile", "s\u00F8vn", "recovery",
    "t\u00F8ye", "t\u00F8yning", "stretching", "fleksibel", "mobilitet",
    "yoga", "pilates", "oppvarming", "nedvarming",
    "nybegynner", "begynner", "starte \u00E5 trene", "starte trening",
    "viderekommen", "erfaren", "avansert",
    "hvor mange ganger", "hvor lang tid", "hvor tungt",
    "riktig teknikk", "riktig form", "utf\u00F8relse",
    "how to train", "how to lose", "how to build", "how to get",
    "training tips", "training advice", "training program", "training plan",
    "exercise", "exercises", "workout routine", "fitness routine",
    "how many reps", "how many sets", "how often should",
    "what should i eat", "diet", "nutrition", "meal plan",
    "calories", "protein intake", "carbohydrates", "fat intake",
    "weight loss", "fat loss", "lose weight", "slimming",
    "muscle building", "build muscle", "gain muscle", "hypertrophy",
    "endurance", "cardio workout", "cardio routine",
    "strength program", "strength training", "lifting program",
    "interval training", "hiit workout", "high intensity",
    "recovery", "rest", "sleep", "recover",
    "stretch", "stretching", "flexibility", "mobility",
    "beginner", "start working out", "start exercising",
    "intermediate", "advanced",
    "how many times", "how long", "how heavy",
    "proper technique", "proper form", "correct form",
    "fitness", "gym", "trene", "tren",
  ];

  const isTraining = trainingPatterns.some(p => lower.includes(p));
  if (isTraining) {
    let trainingTopic = "weight_loss";
    const goal = detectGoal(query);
    if (goal && goal !== "general") {
      trainingTopic = goal;
    } else if (lower.includes("ern\u00E6ring") || lower.includes("kosthold") || lower.includes("diett") ||
               lower.includes("spise") || lower.includes("nutrition") || lower.includes("diet") ||
               lower.includes("kalori") || lower.includes("calorie") || lower.includes("protein") ||
               lower.includes("macro") || lower.includes("matplan") || lower.includes("meal")) {
      trainingTopic = "nutrition";
    } else if (lower.includes("restitu") || lower.includes("recover") || lower.includes("hvile") ||
               lower.includes("s\u00F8vn") || lower.includes("sleep") || lower.includes("rest")) {
      trainingTopic = "recovery";
    } else if (lower.includes("nybegynner") || lower.includes("begynner") || lower.includes("beginner") ||
               lower.includes("starte") || lower.includes("start ")) {
      trainingTopic = "beginner";
    } else if (lower.includes("viderekommen") || lower.includes("intermediate") || lower.includes("advanced") ||
               lower.includes("erfaren")) {
      trainingTopic = "intermediate";
    } else if (lower.includes("t\u00F8y") || lower.includes("stretch") || lower.includes("fleks") ||
               lower.includes("flexib") || lower.includes("mobil")) {
      trainingTopic = "stretching";
    } else if (lower.includes("hiit") || lower.includes("intervall") || lower.includes("interval") ||
               lower.includes("h\u00F8yintens") || lower.includes("high intens")) {
      trainingTopic = "hiit";
    }
    return { type: "training", params: { trainingTopic } };
  }

  return { type: "general", params: {} };
}

// ═══════════════════════════════════════════════════════════
// PT QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function queryPTs(db: ReturnType<typeof getDb>, country?: string, goal?: string, limit = 3): PTInfo[] {
  let query = `
    SELECT
      u.id, u.name, u.country,
      p.years_of_experience, p.specialties, p.hourly_rate,
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
  if (country) { query += " AND u.country = ?"; params.push(country); }
  query += " GROUP BY u.id";
  query += ` ORDER BY
    CASE WHEN COUNT(r.id) > 0
      THEN (SUM(CASE WHEN r.rating = 'good' THEN 1.0 ELSE 0 END) + SUM(CASE WHEN r.rating = 'okay' THEN 0.5 ELSE 0 END)) * 1.0 / COUNT(r.id)
      ELSE 0 END DESC,
    COUNT(r.id) DESC LIMIT ?`;
  params.push(limit);

  const rows = db.query(query).all(...params) as any[];
  let results = rows.map(row => ({
    id: row.id, name: row.name, country: row.country || "",
    years_of_experience: row.years_of_experience || 0,
    specialties: row.specialties || "", hourly_rate: row.hourly_rate || 500,
    ratingPct: (row.total_ratings || 0) > 0
      ? Math.round(((row.good_count * 1.0 + row.okay_count * 0.5) / row.total_ratings) * 100)
      : 0,
    totalRatings: row.total_ratings || 0,
    goodCount: row.good_count || 0, okayCount: row.okay_count || 0, badCount: row.bad_count || 0,
  }));

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
    `SELECT u.id, u.name, u.country, p.years_of_experience, p.specialties, p.hourly_rate,
      COUNT(r.id) as total_ratings,
      SUM(CASE WHEN r.rating = 'good' THEN 1 ELSE 0 END) as good_count,
      SUM(CASE WHEN r.rating = 'okay' THEN 1 ELSE 0 END) as okay_count,
      SUM(CASE WHEN r.rating = 'bad' THEN 1 ELSE 0 END) as bad_count
    FROM users u JOIN pt_profiles p ON u.id = p.user_id
    LEFT JOIN pt_ratings r ON r.pt_user_id = u.id
    WHERE u.role = 'pt' AND u.name LIKE ? GROUP BY u.id`
  ).get(`%${name}%`) as any;
  if (!row) return null;
  const total = row.total_ratings || 0;
  const good = row.good_count || 0;
  const okay = row.okay_count || 0;
  return {
    id: row.id, name: row.name, country: row.country || "",
    years_of_experience: row.years_of_experience || 0,
    specialties: row.specialties || "", hourly_rate: row.hourly_rate || 500,
    ratingPct: total > 0 ? Math.round(((good * 1.0 + okay * 0.5) / total) * 100) : 0,
    totalRatings: total, goodCount: good, okayCount: okay, badCount: row.bad_count || 0,
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
      msg += ` som spesialiserer seg p\u00E5 ${goalNames[goal] || goal}`;
    }
    msg += ". Pr\u00F8v \u00E5 utvide s\u00F8ket ditt eller kom tilbake senere! \📍";
    return msg;
  }
  let msg = "";
  if (country && goal) {
    const goalNames: Record<string, string> = {
      weight_loss: "vekttap \🏃", muscle_gain: "muskelbygging \💪", cardio: "kondisjonstrening \u2764\uFE0F", strength: "styrketrening \🏋\uFE0F",
    };
    msg = `Her er de beste PT-ene i **${country}** for **${goalNames[goal] || goal}**:\n\n`;
  } else if (country) {
    msg = `Her er de beste PT-ene i **${country}**:\n\n`;
  } else if (goal) {
    const goalNames: Record<string, string> = {
      weight_loss: "vekttap \🏃", muscle_gain: "muskelbygging \💪", cardio: "kondisjonstrening \u2764\uFE0F", strength: "styrketrening \🏋\uFE0F",
    };
    msg = `Her er de beste PT-ene for **${goalNames[goal] || goal}**:\n\n`;
  } else {
    msg = "Her er v\u00E5re topprangerte PT-er:\n\n";
  }
  pts.forEach((pt, i) => {
    const stars = pt.ratingPct >= 90 ? "\u2B50\u2B50\u2B50\u2B50\u2B50" : pt.ratingPct >= 80 ? "\u2B50\u2B50\u2B50\u2B50" : pt.ratingPct >= 70 ? "\u2B50\u2B50\u2B50" : "\u2B50\u2B50";
    msg += `**${i + 1}. ${pt.name}** ${stars}\n`;
    msg += `\📍 ${pt.country || "Ukjent"} | \🎓 ${pt.years_of_experience} \u00E5rs erfaring\n`;
    msg += `\💬 ${pt.totalRatings} vurderinger (${pt.ratingPct}% forn\u00F8yde)\n`;
    if (pt.specialties) msg += `\🏷\uFE0F Spesialiteter: ${pt.specialties}\n`;
    msg += `\💰 ${pt.hourly_rate} kr/time\n\n`;
  });
  msg += "Vil du booke en time? G\u00E5 til **Finn PT** i menyen! \📅";
  return msg;
}

// ═══════════════════════════════════════════════════════════
// SMART FALLBACK — never says "I don't understand"
// ═══════════════════════════════════════════════════════════

function generateSmartFallback(query: string): string {
  const lower = query.toLowerCase();

  // Try site content search first
  const siteMatch = searchSiteContent(query);
  if (siteMatch) {
    return "**Her er hva jeg fant om det du spurte om \💡**\n\n" + siteMatch + "\n\nVar dette det du lurte p\u00E5? Du kan ogs\u00E5 sp\u00F8rre meg om:\n\u2022 Trening og treningsprogrammer\n\u2022 PT-er og booking\n\u2022 Priser og abonnementer\n\u2022 Plattformens funksjoner";
  }

  // Try to determine if it's a training-related question that didn't match patterns
  const trainingSignals = [
    "trening", "tren", "muskel", "vekt", "kilo", "kondisjon", "l\u00F8p", "jogg",
    "workout", "exercise", "fitness", "gym", "muscle", "weight",
    "health", "helse", "form", "kropp", "body",
    "\u00F8velse", "rep", "sett", "program", "plan",
  ];
  if (trainingSignals.some(s => lower.includes(s))) {
    return "**Treningshjelp \💪**\n\nDet h\u00F8res ut som du lurer p\u00E5 noe relatert til trening. Jeg kan gi detaljerte svar om:\n\n\🏃 **Vekttap** \u2014 Strategier for fettforbrenning\n\💪 **Muskelbygging** \u2014 Programmer for hypertrofi\n\u2764\uFE0F **Kondisjonstrening** \u2014 Utholdenhet og cardio\n\🏋\uFE0F **Styrketrening** \u2014 Styrkeprogrammer og teknikk\n\🥗 **Ern\u00E6ring** \u2014 Kosthold og makron\u00E6ringsstoffer\n\😴 **Restitusjon** \u2014 S\u00F8vn, hvile og stretching\n\nStill et mer spesifikt sp\u00F8rsm\u00E5l s\u00E5 gir jeg deg et detaljert svar! Hva er m\u00E5let ditt?";
  }

  // Platform-adjacent question
  const platformSignals = [
    "flexora", "plattform", "platform", "app", "nettsted", "website",
    "medlem", "member", "konto", "account", "login", "logg inn",
    "passord", "password", "tilgang", "access",
  ];
  if (platformSignals.some(s => lower.includes(s))) {
    return "**Om Flexora Fitnes \💙**\n\nFlexora er en global, tosidig PT-markedsplass og AI-drevet treningsplattform. Her er de viktigste tingene du kan gj\u00F8re:\n\n\📋 **Registrer deg** \u2014 1 m\u00E5ned gratis pr\u00F8veperiode\n\💰 **Velg abonnement** \u2014 Basis (149), Hybrid (249), Premium (399)\n\🔍 **Finn PT** \u2014 Book verifiserte trenere globalt\n\💪 **Tren smartere** \u2014 3D-visualisering, bevegelseskorreksjon, stemmeveiledning\n\nHva \u00F8nsker du \u00E5 vite mer om?";
  }

  // General curiosity — offer human support
  return "**Takk for sp\u00F8rsm\u00E5let ditt! \🙏**\n\nJeg har ikke et ferdig svar p\u00E5 akkurat dette, men jeg kan hjelpe deg med mye annet:\n\n\🔍 **Finn en PT** \u2014 Si f.eks. \u00ABFinn en PT i Norge for vekttap\u00BB\n\💰 **Priser** \u2014 Sp\u00F8r \u00ABHva koster det?\u00BB\n\📋 **Funksjoner** \u2014 Sp\u00F8r \u00ABHvilke funksjoner har Flexora?\u00BB\n\💪 **Trening** \u2014 Sp\u00F8r \u00ABHvordan bygge muskler?\u00BB eller \u00ABHvordan g\u00E5 ned i vekt?\u00BB\n\📅 **Booking** \u2014 Sp\u00F8r \u00ABHvordan booker jeg en PT?\u00BB\n\👤 **Bli PT** \u2014 Sp\u00F8r \u00ABHvordan blir jeg PT p\u00E5 Flexora?\u00BB\n\nHvis du trenger personlig hjelp, kan du kontakte v\u00E5rt **kundeserviceteam** via support-siden \u2014 de svarer innen 24 timer! \💙";
}

// ═══════════════════════════════════════════════════════════
// MAIN RESPONSE GENERATOR
// ═══════════════════════════════════════════════════════════

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
      const { country, goal, ptName, topic } = intent.params;
      // If a specific PT topic is requested
      if (topic && PT_RESPONSES[topic]) {
        return PT_RESPONSES[topic];
      }
      // If a specific PT name is mentioned
      if (ptName) {
        const pt = getPTByName(db, ptName);
        if (pt) {
          const stars = pt.ratingPct >= 90 ? "\u2B50\u2B50\u2B50\u2B50\u2B50" : pt.ratingPct >= 80 ? "\u2B50\u2B50\u2B50\u2B50" : pt.ratingPct >= 70 ? "\u2B50\u2B50\u2B50" : "\u2B50\u2B50";
          return `**${pt.name}** ${stars}\n\n\📍 ${pt.country || "Ukjent"}\n\🎓 ${pt.years_of_experience} \u00E5rs erfaring\n\💬 ${pt.totalRatings} vurderinger (${pt.ratingPct}% forn\u00F8yde)\n\🏷\uFE0F Spesialiteter: ${pt.specialties || "Ingen spesifisert"}\n\💰 ${pt.hourly_rate} kr/time\n\nVil du booke en time med ${pt.name}? \📅`;
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

    case "training": {
      const trainingTopic = intent.params.trainingTopic || "weight_loss";
      return TRAINING_RESPONSES[trainingTopic] || TRAINING_RESPONSES.weight_loss;
    }

    default: {
      // SMART FALLBACK — never returns "I don't understand"
      return generateSmartFallback(query);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SERVER FUNCTIONS
// ═══════════════════════════════════════════════════════════

export const askAssistant = createServerFn()
  .validator((data: { question: string }) => data)
  .handler(async ({ data }) => {
    const userId = getUserIdFromToken();
    const db = getDb();
    const response = generateResponse(data.question, db);
    if (userId) {
      db.query("INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)").run(userId, data.question);
      db.query("INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)").run(userId, response);
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
    return messages.map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: String(m.created_at) }));
  });

export const clearChatHistory = createServerFn()
  .handler(async () => {
    const userId = getUserIdFromToken();
    if (!userId) return { success: false };
    const db = getDb();
    db.query("DELETE FROM chat_messages WHERE user_id = ?").run(userId);
    return { success: true };
  });
