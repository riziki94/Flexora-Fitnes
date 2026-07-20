import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  getVideoBookingInfo,
  sendSignalingMessage,
  pollSignalingMessages,
  endVideoCall,
} from "~/lib/video-actions";

export const Route = createFileRoute("/app/video/")({
  component: VideoSessionPage,
  validateSearch: (search: Record<string, unknown>) => ({
    bookingId: search.bookingId ? Number(search.bookingId) : undefined,
  }),
});

// Free STUN servers (no TURN needed for P2P)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ── Connection state type ─────────────────────────────────
type ConnState = "loading" | "connecting" | "connected" | "disconnected" | "error";

// ── Timer Component ───────────────────────────────────────
function SessionTimer({
  durationMinutes,
  isActive,
}: {
  durationMinutes: number;
  isActive: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const totalSeconds = durationMinutes * 60;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= totalSeconds) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return totalSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, totalSeconds]);

  const remaining = totalSeconds - elapsed;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = Math.round((elapsed / totalSeconds) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums text-white">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

// ── Connection Status Badge ───────────────────────────────
function ConnBadge({ state }: { state: ConnState }) {
  const config: Record<ConnState, { bg: string; text: string; label: string }> = {
    loading: { bg: "bg-gray-400", text: "text-gray-100", label: "Loading..." },
    connecting: { bg: "bg-yellow-400", text: "text-yellow-100", label: "Connecting" },
    connected: { bg: "bg-green-400", text: "text-green-100", label: "Connected" },
    disconnected: { bg: "bg-red-400", text: "text-red-100", label: "Disconnected" },
    error: { bg: "bg-red-500", text: "text-red-100", label: "Error" },
  };
  const c = config[state];
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${state === "connected" ? "bg-green-200 animate-pulse" : "bg-white/60"}`} />
      {c.label}
    </div>
  );
}

// ── Main Video Page ───────────────────────────────────────
function VideoSessionPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useSearch();

  // State
  const [user, setUser] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [connState, setConnState] = useState<ConnState>("loading");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isPipSelf, setIsPipSelf] = useState(false); // Toggle which is PiP
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef<number>(0);

  // ── Auth check ──────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  // ── Load booking info ───────────────────────────────────
  useEffect(() => {
    if (!user || !bookingId) return;
    getVideoBookingInfo({ bookingId })
      .then((data) => {
        setInfo(data);
        setConnState("connecting");
        startLocalMedia();
      })
      .catch((e: any) => {
        setError(e.message || "Failed to load session");
        setConnState("error");
      });
  }, [user, bookingId]);

  // ── Start local camera/mic ──────────────────────────────
  async function startLocalMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      console.error("Camera error:", e);
      // Try audio-only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
      } catch {
        setError("Camera and microphone access denied. Please allow access in your browser settings.");
        setConnState("error");
      }
    }
  }

  // ── Start WebRTC when local stream + info ready ──────────
  useEffect(() => {
    if (!localStream || !info || connState !== "connecting") return;
    if (callActive) return;

    startWebRTC();
  }, [localStream, info, connState]);

  async function startWebRTC() {
    if (!info || !localStream) return;

    setCallActive(true);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setConnState("connected");
    };

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          bookingId: info.bookingId,
          type: "ice",
          data: JSON.stringify(event.candidate),
        }).catch(console.error);
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnState("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setConnState("disconnected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setConnState("disconnected");
      }
    };

    // Determine who creates the offer (PT creates offer for simplicity)
    if (info.myRole === "pt") {
      // PT creates offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignalingMessage({
          bookingId: info.bookingId,
          type: "offer",
          data: JSON.stringify(offer),
        });
      } catch (e) {
        console.error("Failed to create offer:", e);
        setConnState("error");
        setError("Failed to establish connection");
      }
    }

    // Start polling for signaling messages
    startPolling();
  }

  // ── Poll for signaling messages ─────────────────────────
  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await pollSignalingMessages({
          bookingId: info.bookingId,
          afterId: lastMsgIdRef.current,
        });

        if (result.hasHangup) {
          handleRemoteHangup();
          return;
        }

        for (const msg of result.messages) {
          lastMsgIdRef.current = Math.max(lastMsgIdRef.current, msg.id);
          await handleSignalingMessage(msg);
        }
      } catch (e) {
        // Poll will retry
      }
    }, 2000);
  }

  async function handleSignalingMessage(msg: any) {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (msg.type === "offer") {
        const offer = JSON.parse(msg.data);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignalingMessage({
          bookingId: info.bookingId,
          type: "answer",
          data: JSON.stringify(answer),
        });
      } else if (msg.type === "answer") {
        const answer = JSON.parse(msg.data);
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } else if (msg.type === "ice") {
        const candidate = JSON.parse(msg.data);
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error("Signaling error:", e);
    }
  }

  function handleRemoteHangup() {
    setCallEnded(true);
    setConnState("disconnected");
    cleanupCall();
  }

  // ── Controls ────────────────────────────────────────────
  function toggleMute() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleCamera() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }

  function togglePiP() {
    setIsPipSelf(!isPipSelf);
  }

  async function handleEndCall() {
    setCallEnded(true);
    try {
      await endVideoCall({ bookingId: info.bookingId });
    } catch {}
    cleanupCall();
  }

  function cleanupCall() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setCallActive(false);
  }

  function handleLeave() {
    cleanupCall();
    navigate({ to: "/app/bookings" });
  }

  // ── Logout ──────────────────────────────────────────────
  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  // ── Loading state ───────────────────────────────────────
  if (!bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-xl mb-2">No booking specified</p>
          <button
            onClick={() => navigate({ to: "/app/bookings" })}
            className="text-blue-400 hover:underline"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (error && connState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white max-w-md px-6">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-semibold mb-2">Unable to start video session</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate({ to: "/app/bookings" })}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (connState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500" />
          <p className="text-lg">Loading video session...</p>
        </div>
      </div>
    );
  }

  // ── Main Video UI ───────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Remote video (full screen background) */}
      {remoteStream && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${isPipSelf ? "" : "z-10"}`}
        />
      )}

      {/* Waiting for peer */}
      {!remoteStream && !callEnded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800">
              <span className="text-3xl font-bold text-gray-400">
                {info?.peerName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <p className="text-lg font-medium">
              Waiting for {info?.peerName || "peer"}...
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {info?.myRole === "pt" ? "Share this link with your client" : "Your PT will join shortly"}
            </p>
          </div>
        </div>
      )}

      {/* Call ended overlay */}
      {callEnded && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white">
            <div className="text-5xl mb-4">📞</div>
            <p className="text-xl font-semibold mb-2">Call Ended</p>
            <p className="text-gray-400 mb-6">The video session has ended.</p>
            <button
              onClick={handleLeave}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Back to Bookings
            </button>
          </div>
        </div>
      )}

      {/* Local video (PiP or full depending on toggle) */}
      {localStream && (
        <div
          onClick={togglePiP}
          className={`absolute cursor-pointer overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl transition-all duration-300 ${
            isPipSelf
              ? "inset-0 z-10"
              : "bottom-20 right-4 z-20 h-40 w-28 sm:h-48 sm:w-32"
          }`}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${isCameraOff ? "hidden" : ""}`}
          />
          {isCameraOff && (
            <div className="flex h-full w-full items-center justify-center bg-gray-800">
              <div className="text-center">
                <span className="text-2xl">📷</span>
                <p className="text-xs text-gray-400 mt-1">Camera Off</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            You{isMuted ? " (muted)" : ""}
          </div>
        </div>
      )}

      {/* No camera fallback */}
      {!localStream && !callEnded && (
        <div className="absolute bottom-20 right-4 z-20 flex h-40 w-28 items-center justify-center rounded-xl bg-gray-800 sm:h-48 sm:w-32">
          <span className="text-gray-500 text-xs">No camera</span>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {info?.peerName || "Session"}
          </span>
          <ConnBadge state={connState} />
        </div>
        <div className="flex items-center gap-2">
          {info && (
            <span className="text-xs text-gray-400">
              {info.sessionType === "30min" ? "30 min" : "60 min"} session
            </span>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {info && connState === "connected" && (
        <div className="absolute top-14 left-0 right-0 z-30 px-4">
          <SessionTimer durationMinutes={info.sessionDuration} isActive={!callEnded} />
        </div>
      )}

      {/* Bottom control bar */}
      {!callEnded && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 py-6">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              isMuted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            )}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              isCameraOff
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraOff ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            )}
          </button>

          {/* End Call (big red button) */}
          <button
            onClick={handleEndCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
            title="End Call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" transform="rotate(135 12 12)" />
            </svg>
          </button>

          {/* PiP toggle */}
          <button
            onClick={togglePiP}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            title="Swap Views"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
