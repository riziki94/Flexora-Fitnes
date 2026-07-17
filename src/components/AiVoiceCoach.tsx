import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  getCountdownPhrase,
  getRestCountdown,
  getEncouragement,
  getPhaseTransition,
  getExerciseAnnouncement,
  getSessionComplete,
} from "~/lib/ai-coach-phrases";

// Re-export phrase functions so the parent can import from one place if desired.
export {
  getCountdownPhrase,
  getRestCountdown,
  getEncouragement,
  getPhaseTransition,
  getExerciseAnnouncement,
  getSessionComplete,
};

export interface AiVoiceCoachHandle {
  speak: (text: string) => void;
}

const AiVoiceCoach = forwardRef<AiVoiceCoachHandle>(function AiVoiceCoach(
  _props,
  ref,
) {
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<"idle" | "speaking" | "unsupported">(
    () =>
      typeof window !== "undefined" && "speechSynthesis" in window
        ? "idle"
        : "unsupported",
  );
  const voicesLoaded = useRef(false);

  // SpeechSynthesis voices load asynchronously — wait for them.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      voicesLoaded.current = true;
    };

    // On some browsers getVoices() is immediately populated
    if (synth.getVoices().length > 0) {
      voicesLoaded.current = true;
    } else {
      synth.addEventListener("voiceschanged", loadVoices, { once: true });
    }

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (
        muted ||
        status === "unsupported" ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      )
        return;

      const synth = window.speechSynthesis;

      // Cancel any ongoing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "nb-NO";
      utterance.rate = 0.9;

      // Try to find a Norwegian voice
      const voices = synth.getVoices();
      const nbVoice =
        voices.find((v) => v.lang.startsWith("nb-NO")) ??
        voices.find((v) => v.lang.startsWith("no")) ??
        voices.find((v) => v.lang.startsWith("nn-NO"));
      if (nbVoice) {
        utterance.voice = nbVoice;
      }

      utterance.onstart = () => setStatus("speaking");
      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => setStatus("idle");

      synth.speak(utterance);
    },
    [muted, status],
  );

  useImperativeHandle(ref, () => ({ speak }), [speak]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next && status === "speaking") {
        window.speechSynthesis?.cancel();
        setStatus("idle");
      }
      return next;
    });
  }, [status]);

  // Graceful unsupported banner
  if (status === "unsupported") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 text-white">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-2">
          <span className="text-xs text-gray-400">
            Nettleseren støtter ikke talesyntese
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-700 bg-gray-900/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
        {/* Left: AI PT label + status dot + status text */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-wide text-gray-200">
            AI PT
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              status === "speaking"
                ? "animate-pulse bg-green-400"
                : "bg-gray-500"
            }`}
          />
          <span className="text-xs text-gray-400">
            {status === "speaking" ? "🔊 Snakker..." : "🔊 AI PT klar"}
          </span>
        </div>

        {/* Right: Mute toggle */}
        <button
          onClick={toggleMute}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-gray-800"
          aria-label={muted ? "Skru på AI-stemme" : "Skru av AI-stemme"}
        >
          {muted ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span className="text-gray-400">Lyd av</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span className="text-gray-300">Lyd på</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default AiVoiceCoach;
