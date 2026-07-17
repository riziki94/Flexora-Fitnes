import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import AiVoiceCoach, { type AiVoiceCoachHandle } from "~/components/AiVoiceCoach";

function VoiceTestPage() {
  const coachRef = useRef<AiVoiceCoachHandle>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">AI Voice Coach Test</h1>
      <p className="mb-4 text-sm text-gray-500">
        Klikk for å teste tale — snakker norsk via SpeechSynthesis
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => coachRef.current?.speak("Hei! Dette er en test av AI-treneren.")}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Test tale
        </button>
        <button
          onClick={() => coachRef.current?.speak("Bra jobba! Hold tempoet!")}
          className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Oppmuntring
        </button>
        <button
          onClick={() => coachRef.current?.speak("3... 2... 1... Kjør!")}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Nedtelling
        </button>
      </div>
      <AiVoiceCoach ref={coachRef} />
    </div>
  );
}

export const Route = createFileRoute("/app/voice-test")({
  component: VoiceTestPage,
});
