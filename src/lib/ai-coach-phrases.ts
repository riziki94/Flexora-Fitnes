/**
 * AI voice coach phrases — Norwegian text utilities.
 * Pure functions, no dependencies, no browser APIs.
 */

const ENCOURAGEMENTS = [
  "Bra jobba!",
  "Hold tempoet!",
  "Pust jevnt!",
  "Du er sterk!",
  "Ikke gi opp!",
  "Kjør på!",
] as const;

/**
 * Countdown for exercise start: "5...", "4...", "3...", "2...", "1...", "Kjør!"
 * Pass seconds 5–1 for the countdown, or 0 for the go signal.
 */
export function getCountdownPhrase(seconds: number): string {
  if (seconds <= 0) {
    return "Kjør!";
  }
  return `${seconds}...`;
}

/**
 * Rest-period countdown: "Pause. Neste øvelse om X sekunder."
 */
export function getRestCountdown(seconds: number): string {
  return `Pause. Neste øvelse om ${seconds} sekunder.`;
}

/**
 * Returns a random motivational phrase.
 */
export function getEncouragement(): string {
  const index = Math.floor(Math.random() * ENCOURAGEMENTS.length);
  return ENCOURAGEMENTS[index]!;
}

/**
 * Phase transition announcement.
 * `from` and `to` are phase names like "warmup", "main", "stretching".
 */
export function getPhaseTransition(from: string, to: string): string {
  if (from === "warmup" && to === "main") {
    return "Oppvarming ferdig! Hovedøkten starter.";
  }
  if (from === "main" && to === "stretching") {
    return "Hovedøkten ferdig. Tid for tøying.";
  }
  return `Går fra ${from} til ${to}.`;
}

/**
 * Announces the next exercise with its set and rep count.
 * `reps` is a string to accommodate values like "8–12" or "AMRAP".
 */
export function getExerciseAnnouncement(
  name: string,
  sets: number,
  reps: string,
): string {
  return `Neste: ${name}. ${sets} sett, ${reps} repetisjoner.`;
}

/**
 * Session-complete message.
 */
export function getSessionComplete(): string {
  return "Økten er fullført! Godt jobba i dag!";
}
