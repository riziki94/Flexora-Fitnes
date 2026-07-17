import type { ReactNode } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { getWorkoutPlan } from "~/lib/workout-actions";
import { startWorkoutSession, logSessionExercise, endWorkoutSession } from "~/lib/session-actions";
import AiVoiceCoach, {
  type AiVoiceCoachHandle,
  getExerciseAnnouncement,
  getCountdownPhrase,
  getRestCountdown,
  getEncouragement,
  getPhaseTransition,
  getSessionComplete,
} from "~/components/AiVoiceCoach";

export const Route = createFileRoute("/app/workout/session/$planId")({
  component: WorkoutSessionPage,
});

type EffortLevel = "" | "green" | "yellow" | "red";

interface ExerciseItem {
  id: number;
  exercise_name: string;
  phase: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  sort_order: number;
  notes?: string;
}

const EFFORT_COLORS: Record<string, { bg: string; ring: string; label: string }> = {
  green: { bg: "bg-green-500", ring: "ring-green-500", label: "Moderate" },
  yellow: { bg: "bg-yellow-500", ring: "ring-yellow-500", label: "Challenging" },
  red: { bg: "bg-red-500", ring: "ring-red-500", label: "Maximum" },
};

const CHIME_SOUNDS = {
  end: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f39/f3+Af39/f3+Af39/gH9/f3+Af39/f3+Af39/f39/gH9/f3+Af39/gH9/f4B/f39/f39/f39/f3+Af39/f39/f3+Af39/gH9/f3+Af39/f39/f4B/f39/gH9/f39/f39/f3+Af39/f3+Af39/f39/f3+Af39/f39/f39/f3+Af39/f39/gH9/f4B/f39/f39/f39/f39/f39/f3+Af39/f3+Af39/f39/f39/f39/gH9/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/gH9/f39/f39/f3+Af39/f3+Af39/f39/f39/f39/f3+Af39/f3+Af39/f39/f39/f39/f39/f4B/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f3+Af39/f39/gH9/f3+Af39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f3+Af39/f3+Af39/f3+Af39/f39/f3+Af39/f3+Af39/f39/f3+Af39/f39/f3+Af39/f39/f3+Af39/f39/f39/f39/f39/f3+Af39/f39/f3+Af39/f3+Af39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/gH9/f3+Af39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f3+Af39/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/gH9/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f3+Af39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f3+Af39/f3+Af39/f39/f3+Af39/f39/f39/f3+Af39/f3+Af39/f39=",
};

function playChime() {
  try {
    const audio = new Audio(CHIME_SOUNDS.end);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}

function BreathingRing({ onBreath }: { onBreath: (phase: "inhale" | "exhale", bpm: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [breaths, setBreaths] = useState<{ phase: string; time: number }[]>([]);
  const [bpm, setBpm] = useState(0);
  const [guideProgress, setGuideProgress] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const cycleRef = useRef<"inhale" | "exhale">("inhale");
  const cycleLen = 4000; // 4s inhale, 4s exhale

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    startRef.current = performance.now();
    function draw(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - startRef.current;
      const cyclePos = elapsed % (cycleLen * 2);
      const currentPhase: "inhale" | "exhale" = cyclePos < cycleLen ? "inhale" : "exhale";
      cycleRef.current = currentPhase;
      const progress = currentPhase === "inhale" ? cyclePos / cycleLen : (cyclePos - cycleLen) / cycleLen;
      setGuideProgress(progress);

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) / 2 - 8;
      const minR = maxR * 0.35;
      const r = minR + (maxR - minR) * (currentPhase === "inhale" ? progress : 1 - progress);

      // Outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(26,86,219,0.1)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Breathing ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r);
      gradient.addColorStop(0, "rgba(26,86,219,0.4)");
      gradient.addColorStop(0.7, "rgba(26,86,219,0.6)");
      gradient.addColorStop(1, "rgba(26,86,219,0.9)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#1A56DB";
      ctx.fill();

      // Phase label
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentPhase === "inhale" ? "INHALE" : "EXHALE", cx, cy + r + 16);

      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function handleTap() {
    const now = Date.now();
    const currentPhase = cycleRef.current;
    const newBreaths = [...breaths, { phase: currentPhase, time: now }];
    // Keep last 30s of breaths
    const recent = newBreaths.filter((b) => now - b.time < 30000);
    setBreaths(recent);
    // Calculate BPM: count breath pairs (inhale+exhale) in recent window
    let newBpm = 0;
    if (recent.length >= 2) {
      const windowMs = recent[recent.length - 1]!.time - recent[0]!.time;
      const pairs = Math.floor(recent.length / 2);
      if (windowMs > 0) {
        newBpm = Math.round((pairs / windowMs) * 60000);
      }
    }
    setBpm(newBpm);
    onBreath(currentPhase, newBpm);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          style={{ width: 160, height: 160 }}
          onClick={handleTap}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">Tap to track breath</p>
      {bpm > 0 && (
        <p className="mt-1 text-sm font-semibold text-[#1A56DB]">
          {bpm} breaths/min
        </p>
      )}
    </div>
  );
}

function SpotifyPlayer({ onPauseRequest }: { onPauseRequest: (cb: () => void) => void }) {
  const [url, setUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let u = url.trim();
    if (!u) return;
    u = u.replace("/playlist/", "/embed/playlist/").replace("/track/", "/embed/track/").replace("/album/", "/embed/album/");
    if (!u.includes("/embed/")) {
      if (u.includes("spotify.com")) {
        u = u.replace("open.spotify.com", "open.spotify.com/embed");
        if (!u.includes("/embed/")) u = u.replace("spotify.com/", "spotify.com/embed/");
      }
    }
    setEmbedUrl(u);
  }

  useEffect(() => {
    onPauseRequest(() => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ command: "pause" }, "*");
        }
      } catch {}
    });
  }, [onPauseRequest]);

  return (
    <div>
      {!embedUrl ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Spotify playlist/track URL"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ed760]">
            Load
          </button>
        </form>
      ) : (
        <div>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          />
          <button
            onClick={() => { setEmbedUrl(""); setUrl(""); }}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600"
          >
            Change music
          </button>
        </div>
      )}
    </div>
  );
}

function EffortButton({ level, selected, onClick }: { level: "green" | "yellow" | "red"; selected: boolean; onClick: () => void }) {
  const colorMap = {
    green: { dot: "bg-green-500", selected: "border-green-500 bg-green-50 text-green-700", label: "Moderate" },
    yellow: { dot: "bg-yellow-500", selected: "border-yellow-500 bg-yellow-50 text-yellow-700", label: "Challenging" },
    red: { dot: "bg-red-500", selected: "border-red-500 bg-red-50 text-red-700", label: "Maximum" },
  };
  const c = colorMap[level];
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
        selected ? c.selected : "border-gray-200 text-gray-400 hover:border-gray-300"
      }`}
    >
      <span className={`inline-block h-3 w-3 rounded-full ${c.dot} mr-1.5`} />
      {c.label}
    </button>
  );
}

function WorkoutSessionPage() {
  const navigate = useNavigate();
  const params = useParams({ from: "/app/workout/session/$planId" });
  const planId = Number(params.planId);

  const [plan, setPlan] = useState<any>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [effortLevels, setEffortLevels] = useState<Record<number, EffortLevel>>({});
  const [breathData, setBreathData] = useState<Record<number, number>>({});
  const [showBreathing, setShowBreathing] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // AiVoiceCoach ref
  const coachRef = useRef<AiVoiceCoachHandle>(null);

  // Track previous phase for transition detection
  const prevPhaseRef = useRef<string>("");

  // Session timer
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const encouragementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef = useRef<() => void>(() => {});

  // State for pause/resume voice commands
  const [sessionPaused, setSessionPaused] = useState(false);

  // Load plan data
  useEffect(() => {
    getWorkoutPlan({ id: planId })
      .then((data: any) => {
        setPlan(data.plan);
        const today = new Date().getDay();
        const dayOfWeek = today === 0 ? 7 : today;
        const todayData = data.days[dayOfWeek] || { warmup: [], main: [], stretching: [] };
        const allEx: ExerciseItem[] = [
          ...todayData.warmup,
          ...todayData.main,
          ...todayData.stretching,
        ];
        setExercises(allEx);
      })
      .catch((e: any) => setError(e.message || "Failed to load plan"))
      .finally(() => setLoading(false));
  }, [planId]);

  // Start session
  useEffect(() => {
    if (exercises.length === 0 || sessionId !== null) return;
    startWorkoutSession({ planId }).then((r: any) => {
      setSessionId(r.sessionId);
    }).catch(console.error);
  }, [exercises, sessionId, planId]);

  // Session timer (pauses when sessionPaused is true)
  useEffect(() => {
    if (!sessionId || sessionPaused) return;
    sessionTimerRef.current = setInterval(() => {
      setSessionTime((t) => t + 1);
    }, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [sessionId, sessionPaused]);

  // ── Auto-announce exercises on currentIndex change ───────────────
  useEffect(() => {
    if (exercises.length === 0 || currentIndex >= exercises.length) return;
    const ex = exercises[currentIndex]!;
    const phrase = getExerciseAnnouncement(ex.exercise_name, ex.sets, ex.reps);
    const timer = setTimeout(() => {
      coachRef.current?.speak(phrase);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentIndex, exercises]);

  // ── Phase transition detection ──────────────────────────────────
  useEffect(() => {
    if (exercises.length === 0 || currentIndex >= exercises.length) return;
    const currentPhase = exercises[currentIndex]!.phase;
    const prevPhase = prevPhaseRef.current;

    if (prevPhase && currentPhase !== prevPhase) {
      const phrase = getPhaseTransition(prevPhase, currentPhase);
      setTimeout(() => {
        coachRef.current?.speak(phrase);
      }, 300);
    }

    prevPhaseRef.current = currentPhase;
  }, [currentIndex, exercises]);

  // ── Random encouragement during active phase ────────────────────
  useEffect(() => {
    if (sessionPaused || restActive || sessionComplete) {
      if (encouragementTimerRef.current) {
        clearInterval(encouragementTimerRef.current);
        encouragementTimerRef.current = null;
      }
      return;
    }
    if (exercises.length === 0 || currentIndex >= exercises.length) return;

    // Random interval between 30-45 seconds
    const scheduleEncouragement = () => {
      const delay = 30000 + Math.random() * 15000;
      encouragementTimerRef.current = setTimeout(() => {
        coachRef.current?.speak(getEncouragement());
        // Schedule next
        scheduleEncouragement();
      }, delay);
    };

    scheduleEncouragement();

    return () => {
      if (encouragementTimerRef.current) {
        clearTimeout(encouragementTimerRef.current);
        encouragementTimerRef.current = null;
      }
    };
  }, [sessionPaused, restActive, sessionComplete, currentIndex, exercises.length]);

  // ── Rest timer logic with countdown ──────────────────────────────
  useEffect(() => {
    if (!restActive || restSeconds <= 0 || sessionPaused) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return;
    }

    const lastSpokenRef = { second: -1 };
    restTimerRef.current = setInterval(() => {
      setRestSeconds((s) => {
        const next = s - 1;

        // Voice countdown for last 5 seconds
        if (next <= 5 && next > 0 && next !== lastSpokenRef.second) {
          lastSpokenRef.second = next;
          coachRef.current?.speak(getCountdownPhrase(next));
        }
        if (next === 0) {
          lastSpokenRef.second = 0;
          playChime();
          setRestActive(false);
          setRestSeconds(0);
          coachRef.current?.speak(getCountdownPhrase(0)); // "Kjør!"
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restActive, sessionPaused]);

  // ── Voice command handler ────────────────────────────────────────
  const handleVoiceCommand = useCallback((cmd: string, _rawText: string) => {
    switch (cmd) {
      case "pause":
        if (!sessionPaused) {
          setSessionPaused(true);
          coachRef.current?.speak("Økten er pauset.");
        }
        break;
      case "resume":
        if (sessionPaused) {
          setSessionPaused(false);
          coachRef.current?.speak("Økten fortsetter.");
        }
        break;
      case "next":
        if (restActive) {
          // Skip rest
          setRestActive(false);
          setRestSeconds(0);
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          coachRef.current?.speak("Hoppet over pause.");
        } else if (currentIndex + 1 < exercises.length) {
          // Skip to next exercise
          setCurrentIndex((i) => i + 1);
          setCurrentSet(1);
          setShowBreathing(false);
          coachRef.current?.speak("Hoppet til neste øvelse.");
        }
        break;
      case "previous":
        if (currentIndex > 0) {
          setCurrentIndex((i) => i - 1);
          setCurrentSet(1);
          setShowBreathing(false);
          setRestActive(false);
          setRestSeconds(0);
          coachRef.current?.speak("Gått til forrige øvelse.");
        }
        break;
      case "remaining": {
        const remaining = exercises.length - currentIndex - 1;
        if (remaining > 0) {
          coachRef.current?.speak(`${remaining} øvelser igjen.`);
        } else if (currentIndex < exercises.length) {
          coachRef.current?.speak("Dette er siste øvelse.");
        } else {
          coachRef.current?.speak("Økten er ferdig.");
        }
        break;
      }
    }
  }, [sessionPaused, restActive, currentIndex, exercises.length]);

  function formatTime(s: number): string {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function handleStartRest(seconds: number) {
    setRestSeconds(seconds);
    setRestTotal(seconds);
    setRestActive(true);
    // Announce rest duration
    coachRef.current?.speak(getRestCountdown(seconds));
  }

  async function handleCompleteSet() {
    if (currentIndex >= exercises.length) return;
    const ex = exercises[currentIndex]!;

    if (currentSet < ex.sets) {
      setCurrentSet((s) => s + 1);
      handleStartRest(ex.rest_seconds);
    } else {
      // Exercise complete — log it
      const effort = effortLevels[ex.id] || "";
      const bpm = breathData[ex.id] || 0;

      if (sessionId) {
        try {
          await logSessionExercise({
            sessionId,
            planExerciseId: ex.id,
            exerciseName: ex.exercise_name,
            phase: ex.phase,
            setsCompleted: ex.sets,
            totalSets: ex.sets,
            reps: ex.reps,
            effortLevel: effort,
            breathsPerMinute: bpm,
            sortOrder: currentIndex,
          });
        } catch (e) {
          console.error("Failed to log exercise:", e);
        }
      }

      // Move to next exercise
      if (currentIndex + 1 < exercises.length) {
        setCurrentIndex((i) => i + 1);
        setCurrentSet(1);
        setShowBreathing(false);
        // Start rest before next exercise
        const nextEx = exercises[currentIndex + 1];
        if (nextEx && nextEx.rest_seconds > 0) {
          handleStartRest(nextEx.rest_seconds);
        }
      } else {
        // Session complete
        setSessionComplete(true);
        coachRef.current?.speak(getSessionComplete());
        if (sessionId) {
          try {
            await endWorkoutSession({ sessionId });
          } catch (e) {
            console.error("Failed to end session:", e);
          }
        }
        // Navigate after a brief delay so the user hears the completion message
        setTimeout(() => {
          navigate({ to: '/app/workout/session-summary', search: { sessionId: String(sessionId), planId: String(planId) } });
        }, 2500);
      }
    }
  }

  function handleEffortUpdate(exId: number, level: EffortLevel) {
    setEffortLevels((prev) => ({ ...prev, [exId]: level }));
  }

  function handleBreathCapture(exId: number, _phase: "inhale" | "exhale", bpm: number) {
    if (bpm > 0) {
      setBreathData((prev) => ({ ...prev, [exId]: bpm }));
    }
  }

  function handleEndSession() {
    if (sessionId) {
      endWorkoutSession({ sessionId }).then(() => {
        navigate({ to: '/app/workout/session-summary', search: { sessionId: String(sessionId), planId: String(planId) } });
      }).catch(console.error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-500">No exercises scheduled for today.</p>
        <a href={`/app/workout/plans/${planId}`} className="text-sm font-medium text-[#1A56DB] hover:underline">
          ← Back to Plan
        </a>
      </div>
    );
  }

  const currentEx = exercises[currentIndex]!;
  const progress = ((currentIndex + (currentSet > 0 ? (currentSet - 1) / currentEx.sets : 0)) / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <a href="/app/dashboard" className="text-sm text-gray-500 hover:text-[#1A56DB]">← Exit</a>
          <div className="flex items-center gap-4">
            {sessionPaused && (
              <span className="rounded-full bg-yellow-100 px-3 py-0.5 text-xs font-semibold text-yellow-700">
                PAUSED
              </span>
            )}
            <span className="text-sm font-medium text-gray-700">{formatTime(sessionTime)}</span>
            <span className="text-xs text-gray-400">{currentIndex + 1}/{exercises.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Music toggle */}
            <button
              onClick={() => setMusicPanelOpen(!musicPanelOpen)}
              className={`rounded-lg p-2 text-xs ${musicPanelOpen ? "bg-[#1DB954]/10 text-[#1DB954]" : "bg-gray-100 text-gray-500"}`}
              title="Music"
            >
              🎵
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-[#1A56DB] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Music panel */}
        {musicPanelOpen && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Music</h3>
            <SpotifyPlayer onPauseRequest={(cb) => { pauseRef.current = cb; }} />
          </div>
        )}

        {/* Rest timer overlay */}
        {restActive && (
          <div className="mb-6 rounded-2xl bg-[#1A56DB] p-8 text-center text-white">
            <p className="text-sm font-medium uppercase tracking-wider text-blue-200">Rest Period</p>
            <p className="mt-2 text-6xl font-bold">{restSeconds}</p>
            <p className="mt-1 text-sm text-blue-200">seconds remaining</p>
            <div className="mt-4 h-2 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000"
                style={{ width: `${restTotal > 0 ? (restSeconds / restTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Current exercise card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {/* Phase badge */}
          <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
            currentEx.phase === "warmup" ? "bg-orange-100 text-orange-600" :
            currentEx.phase === "stretching" ? "bg-purple-100 text-purple-600" :
            "bg-blue-100 text-blue-600"
          }`}>
            {currentEx.phase === "warmup" ? "WARMUP" : currentEx.phase === "stretching" ? "STRETCHING" : "MAIN"}
          </span>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">{currentEx.exercise_name}</h1>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Sets</p>
              <p className="text-xl font-bold text-gray-900">
                <span className="text-[#1A56DB]">{currentSet}</span>
                <span className="text-gray-300">/{currentEx.sets}</span>
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Reps</p>
              <p className="text-xl font-bold text-gray-900">{currentEx.reps}</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Rest</p>
              <p className="text-xl font-bold text-gray-900">{currentEx.rest_seconds}s</p>
            </div>
          </div>

          {/* Current set indicator */}
          <div className="mt-4 flex gap-2">
            {Array.from({ length: currentEx.sets }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < currentSet - 1 ? "bg-green-500" : i === currentSet - 1 ? "bg-[#1A56DB]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Notes */}
          {currentEx.notes && (
            <p className="mt-3 text-sm italic text-gray-400">{currentEx.notes}</p>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCompleteSet}
              disabled={restActive || sessionPaused}
              className="flex-1 rounded-xl bg-[#1A56DB] px-6 py-3 text-lg font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {currentSet < currentEx.sets ? `Complete Set ${currentSet}` : "Complete Exercise"}
            </button>
            {currentEx.rest_seconds > 0 && !restActive && (
              <button
                onClick={() => handleStartRest(currentEx.rest_seconds)}
                className="rounded-xl bg-gray-100 px-6 py-3 text-lg font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Rest
              </button>
            )}
          </div>

          {/* Effort indicator */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Rate Your Effort</p>
            <div className="flex gap-3">
              <EffortButton
                level="green"
                selected={effortLevels[currentEx.id] === "green"}
                onClick={() => handleEffortUpdate(currentEx.id, "green")}
              />
              <EffortButton
                level="yellow"
                selected={effortLevels[currentEx.id] === "yellow"}
                onClick={() => handleEffortUpdate(currentEx.id, "yellow")}
              />
              <EffortButton
                level="red"
                selected={effortLevels[currentEx.id] === "red"}
                onClick={() => handleEffortUpdate(currentEx.id, "red")}
              />
            </div>
          </div>

          {/* Breathing measurement toggle */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowBreathing(!showBreathing)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-500 uppercase tracking-wider"
            >
              <span>Breathing Rate</span>
              <span className="text-xs text-gray-400">{showBreathing ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showBreathing && (
              <div className="mt-4">
                <BreathingRing
                  onBreath={(phase, bpm) => {
                    handleBreathCapture(currentEx.id, phase, bpm);
                  }}
                />
                {breathData[currentEx.id] !== undefined && breathData[currentEx.id] > 0 && (
                  <p className="mt-2 text-center text-sm text-gray-500">
                    Last recorded: {breathData[currentEx.id]} breaths/min
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Exercise list (collapsed) */}
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Up Next</h3>
          <div className="space-y-1">
            {exercises.map((ex, i) => {
              const isCurrent = i === currentIndex;
              const isDone = i < currentIndex;
              return (
                <div
                  key={ex.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isCurrent ? "bg-blue-50 font-medium text-[#1A56DB]" :
                    isDone ? "text-gray-400 line-through" : "text-gray-500"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs">
                    {isDone ? "✓" : i + 1}
                  </span>
                  {ex.exercise_name}
                  {effortLevels[ex.id] && (
                    <span className={`ml-auto h-2.5 w-2.5 rounded-full ${
                      effortLevels[ex.id] === "green" ? "bg-green-500" :
                      effortLevels[ex.id] === "yellow" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* End session */}
        <div className="mt-4 text-center">
          <button
            onClick={handleEndSession}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            End Session Early
          </button>
        </div>
      </main>

      {/* AiVoiceCoach overlay bar */}
      <AiVoiceCoach ref={coachRef} onCommand={handleVoiceCommand} />
    </div>
  );
}
