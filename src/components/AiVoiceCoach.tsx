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

export interface AiVoiceCoachProps {
  onCommand?: (cmd: string, rawText: string) => void;
}

// ── Norwegian command keywords ─────────────────────────────
const COMMANDS: { keywords: string[]; cmd: string }[] = [
  { keywords: ["pause", "stopp", "stop"], cmd: "pause" },
  { keywords: ["fortsett", "start", "resume", "kjør"], cmd: "resume" },
  { keywords: ["neste", "neste øvelse", "skip"], cmd: "next" },
  { keywords: ["forrige"], cmd: "previous" },
  { keywords: ["hvor mange igjen", "hvor mange øvelser", "igjen"], cmd: "remaining" },
  { keywords: ["lengre pause"], cmd: "longer_rest" },
  { keywords: ["kortere pause"], cmd: "shorter_rest" },
];

function matchCommand(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const entry of COMMANDS) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry.cmd;
    }
  }
  return null;
}

const AiVoiceCoach = forwardRef<AiVoiceCoachHandle, AiVoiceCoachProps>(
  function AiVoiceCoach({ onCommand }, ref) {
    const [muted, setMuted] = useState(false);
    const [ttsStatus, setTtsStatus] = useState<"idle" | "speaking" | "unsupported">(
      () =>
        typeof window !== "undefined" && "speechSynthesis" in window
          ? "idle"
          : "unsupported",
    );
    const voicesLoaded = useRef(false);

    // ── SpeechSynthesis (TTS) ──────────────────────────────
    useEffect(() => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;

      const loadVoices = () => {
        voicesLoaded.current = true;
      };

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
          ttsStatus === "unsupported" ||
          typeof window === "undefined" ||
          !("speechSynthesis" in window)
        )
          return;

        const synth = window.speechSynthesis;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "nb-NO";
        utterance.rate = 0.9;

        const voices = synth.getVoices();
        const nbVoice =
          voices.find((v) => v.lang.startsWith("nb-NO")) ??
          voices.find((v) => v.lang.startsWith("no")) ??
          voices.find((v) => v.lang.startsWith("nn-NO"));
        if (nbVoice) {
          utterance.voice = nbVoice;
        }

        utterance.onstart = () => setTtsStatus("speaking");
        utterance.onend = () => setTtsStatus("idle");
        utterance.onerror = () => setTtsStatus("idle");

        synth.speak(utterance);
      },
      [muted, ttsStatus],
    );

    useImperativeHandle(ref, () => ({ speak }), [speak]);

    // ── Speech Recognition (STT) ───────────────────────────
    const [sttSupported, setSttSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [sttMode, setSttMode] = useState<"push" | "toggle">("push");
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        setSttSupported(false);
        return;
      }
      setSttSupported(true);
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "nb-NO";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const text: string = event.results[0][0].transcript;
        setTranscript(text);
        const cmd = matchCommand(text);
        if (cmd && onCommand) {
          onCommand(cmd, text);
        }
        if (sttMode === "toggle") {
          setListening(false);
        }
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        if (sttMode === "toggle") {
          setListening(false);
        }
      };

      recognitionRef.current = recognition;
    }, [sttMode, onCommand]);

    const startListening = useCallback(() => {
      if (!recognitionRef.current || listening) return;
      try {
        if (ttsStatus === "speaking") {
          window.speechSynthesis?.cancel();
          setTtsStatus("idle");
        }
        setTranscript("");
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // Already started or error
      }
    }, [listening, ttsStatus]);

    const stopListening = useCallback(() => {
      if (!recognitionRef.current || !listening) return;
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      setListening(false);
    }, [listening]);

    const toggleListening = useCallback(() => {
      if (listening) {
        stopListening();
      } else {
        startListening();
      }
    }, [listening, startListening, stopListening]);

    // ── Camera PiP ─────────────────────────────────────────
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState("");
    const pipVideoRef = useRef<HTMLVideoElement>(null);

    const startCamera = useCallback(async () => {
      setCameraError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 160 }, height: { ideal: 120 }, facingMode: "user" },
          audio: false,
        });
        setCameraStream(stream);
        setCameraOn(true);
      } catch (e: any) {
        setCameraError(e.message || "Camera unavailable");
      }
    }, []);

    const stopCamera = useCallback(() => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      setCameraOn(false);
      setCameraError("");
    }, [cameraStream]);

    const toggleCamera = useCallback(() => {
      if (cameraOn) {
        stopCamera();
      } else {
        startCamera();
      }
    }, [cameraOn, startCamera, stopCamera]);

    // Attach stream to PiP video
    useEffect(() => {
      if (pipVideoRef.current && cameraStream) {
        pipVideoRef.current.srcObject = cameraStream;
      }
    }, [cameraStream]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
        }
      };
    }, [cameraStream]);

    // ── Mute toggle ────────────────────────────────────────
    const toggleMute = useCallback(() => {
      setMuted((prev) => {
        const next = !prev;
        if (next && ttsStatus === "speaking") {
          window.speechSynthesis?.cancel();
          setTtsStatus("idle");
        }
        return next;
      });
    }, [ttsStatus]);

    // ── Toggle STT mode ────────────────────────────────────
    const cycleSttMode = useCallback(() => {
      if (listening) {
        stopListening();
      }
      setSttMode((prev) => (prev === "push" ? "toggle" : "push"));
    }, [listening, stopListening]);

    // ── Unsupported banner ─────────────────────────────────
    if (ttsStatus === "unsupported") {
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
      <>
        {/* ── Camera PiP overlay ───────────────────────────── */}
        {cameraOn && cameraStream && (
          <div className="fixed bottom-16 right-4 z-50 overflow-hidden rounded-xl border-2 border-[#1A56DB] bg-black shadow-lg"
            style={{ width: 120, height: 90 }}>
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-[10px] text-gray-400">
                📷❌
              </div>
            )}
          </div>
        )}

        {/* ── STT transcript tooltip ───────────────────────── */}
        {transcript && (
          <div className="fixed bottom-14 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-xs text-white shadow backdrop-blur">
            🎤 &ldquo;{transcript}&rdquo;
          </div>
        )}

        {/* ── Control bar ──────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-700 bg-gray-900/95 text-white backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
            {/* Left: AI PT label + status dot */}
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-wide text-gray-200">
                AI PT
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  ttsStatus === "speaking"
                    ? "animate-pulse bg-green-400"
                    : listening
                      ? "animate-pulse bg-red-400"
                      : "bg-gray-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {ttsStatus === "speaking"
                  ? "🔊 Snakker..."
                  : listening
                    ? "🎤 Lytter..."
                    : "AI PT klar"}
              </span>
            </div>

            {/* Center: mic + camera buttons */}
            <div className="flex items-center gap-1.5">
              {/* STT mic button */}
              {sttSupported && (
                <>
                  <button
                    onMouseDown={sttMode === "push" ? startListening : undefined}
                    onMouseUp={sttMode === "push" ? stopListening : undefined}
                    onMouseLeave={sttMode === "push" ? stopListening : undefined}
                    onTouchStart={sttMode === "push" ? startListening : undefined}
                    onTouchEnd={sttMode === "push" ? stopListening : undefined}
                    onClick={sttMode === "toggle" ? toggleListening : undefined}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      cycleSttMode();
                    }}
                    className={`flex items-center justify-center rounded-full p-2 transition-all ${
                      listening
                        ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                    title={
                      sttMode === "push"
                        ? "Hold for å snakke (høyreklikk for toggle)"
                        : "Trykk for å starte/stoppe (høyreklikk for hold)"
                    }
                    aria-label={listening ? "Lytter..." : "Trykk for å snakke"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                  {/* Mode indicator */}
                  <span
                    className="cursor-pointer select-none text-[10px] text-gray-500"
                    onClick={cycleSttMode}
                    title="Bytt mellom hold-og-snakk / toggle-modus"
                  >
                    {sttMode === "push" ? "hold" : "✓"}
                  </span>
                </>
              )}

              {/* Camera toggle button */}
              <button
                onClick={toggleCamera}
                className={`flex items-center justify-center rounded-full p-2 transition-all ${
                  cameraOn
                    ? "bg-[#1A56DB] text-white shadow-lg shadow-[#1A56DB]/50"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={cameraOn ? "Skru av kamera" : "Skru på kamera"}
                aria-label={cameraOn ? "Skru av kamera" : "Skru på kamera"}
              >
                {cameraOn ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
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
      </>
    );
  },
);

export default AiVoiceCoach;
