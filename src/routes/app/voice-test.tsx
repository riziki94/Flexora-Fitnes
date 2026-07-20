import { useRef, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import AiVoiceCoach, { type AiVoiceCoachHandle } from "~/components/AiVoiceCoach";
import {
  getExerciseAnnouncement,
  getCountdownPhrase,
  getRestCountdown,
  getEncouragement,
  getPhaseTransition,
  getSessionComplete,
} from "~/components/AiVoiceCoach";

function VoiceTestPage() {
  const coachRef = useRef<AiVoiceCoachHandle>(null);
  const [sttResults, setSttResults] = useState<{ cmd: string; raw: string; time: number }[]>([]);

  const handleCommand = useCallback((cmd: string, rawText: string) => {
    const entry = { cmd, raw: rawText, time: Date.now() };
    setSttResults((prev) => [entry, ...prev].slice(0, 10));
    coachRef.current?.speak(`Oppfattet: ${cmd}`);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6 pb-24">
      <h1 className="mb-2 text-2xl font-bold text-gray-800">AI Voice Coach Test</h1>
      <p className="mb-6 text-sm text-gray-500">
        Test tale (TTS), stemmegjenkjenning (STT) og kamera — snakker og lytter på norsk via Web Speech API
      </p>

      {/* ── TTS Test Buttons ─────────────────────────────── */}
      <div className="mb-4 max-w-lg w-full rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">🔊 TTS — Talesyntese</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => coachRef.current?.speak("Hei! Dette er en test av AI-treneren.")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Test tale
          </button>
          <button
            onClick={() => coachRef.current?.speak(getEncouragement())}
            className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
          >
            Oppmuntring
          </button>
          <button
            onClick={() => coachRef.current?.speak(getCountdownPhrase(3))}
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
          >
            Nedtelling
          </button>
          <button
            onClick={() =>
              coachRef.current?.speak(
                getExerciseAnnouncement("Knebøy", 3, "10"),
              )
            }
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
          >
            Øvelse
          </button>
          <button
            onClick={() => coachRef.current?.speak(getRestCountdown(60))}
            className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Pause
          </button>
          <button
            onClick={() =>
              coachRef.current?.speak(getPhaseTransition("warmup", "main"))
            }
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Faseovergang
          </button>
          <button
            onClick={() => coachRef.current?.speak(getSessionComplete())}
            className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-700"
          >
            Økt ferdig
          </button>
        </div>
      </div>

      {/* ── STT Test ─────────────────────────────────────── */}
      <div className="mb-4 max-w-lg w-full rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          🎤 STT — Stemmegjenkjenning
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Bruk mikrofonknappen i AI PT-baren nederst for å snakke. Hold for
          push-to-talk, eller høyreklikk for toggle-modus. Si{" "}
          <strong>&ldquo;pause&rdquo;</strong>,{" "}
          <strong>&ldquo;neste&rdquo;</strong>,{" "}
          <strong>&ldquo;hvor mange igjen&rdquo;</strong> for å teste
          talekommandoer.
        </p>

        {/* Real-time STT results */}
        {sttResults.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {sttResults.map((r, i) => (
              <div
                key={r.time}
                className={`rounded-lg px-3 py-2 text-xs font-mono ${
                  i === 0
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <span className="font-semibold">{r.cmd}</span>{" "}
                <span className="text-gray-400">— &ldquo;{r.raw}&rdquo;</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 italic">
            Ingen talekommandoer mottatt ennå. Prøv å si &ldquo;pause&rdquo; i
            mikrofonen.
          </div>
        )}
      </div>

      {/* ── Camera Toggle Test ───────────────────────────── */}
      <div className="mb-4 max-w-lg w-full rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          📷 Kamera — Picture-in-Picture
        </h3>
        <p className="text-xs text-gray-500">
          Bruk kamera-knappen i AI PT-baren nederst for å skru på/av
          PiP-kameraet. Kameraet vises som et lite vindu nederst til høyre.
        </p>
      </div>

      {/* ── Mute Toggle Test ─────────────────────────────── */}
      <div className="mb-4 max-w-lg w-full rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          🔇 Lyd av/på
        </h3>
        <p className="text-xs text-gray-500">
          Bruk &ldquo;Lyd av&rdquo; / &ldquo;Lyd på&rdquo;-knappen i AI
          PT-baren nederst for å skru av/på AI-stemmen.
        </p>
      </div>

      {/* ── AI Voice Coach bar ───────────────────────────── */}
      <AiVoiceCoach ref={coachRef} onCommand={handleCommand} />
    </div>
  );
}

export const Route = createFileRoute("/app/voice-test")({
  component: VoiceTestPage,
});
