import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/video/test")({
  component: CameraTestPage,
});

type StatusState = "idle" | "active" | "error";

// ── Status Badge ───────────────────────────────────────────
function StatusBadge({ state, message }: { state: StatusState; message?: string }) {
  const config: Record<StatusState, { bg: string; text: string; dot: string; label: string }> = {
    idle: { bg: "bg-gray-600", text: "text-gray-200", dot: "bg-gray-400", label: "Waiting" },
    active: { bg: "bg-green-600", text: "text-green-100", dot: "bg-green-300 animate-pulse", label: "Active" },
    error: { bg: "bg-red-600", text: "text-red-100", dot: "bg-red-300", label: "Error" },
  };
  const c = config[state];
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      {message || c.label}
    </div>
  );
}

// ── Main Camera Test Page ──────────────────────────────────
function CameraTestPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<StatusState>("idle");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // ── Start camera ─────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError("");
    setStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      setLocalStream(stream);
      setIsMuted(false);
      setIsCameraOff(false);
      setStatus("active");
    } catch (e: any) {
      console.error("Camera error:", e);
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Camera or microphone access denied. Please allow access in your browser settings and try again.");
      } else if (e.name === "NotFoundError") {
        setError("No camera or microphone found. Please connect a device and try again.");
      } else if (e.name === "NotReadableError") {
        setError("Camera is in use by another application. Please close other apps and try again.");
      } else {
        setError(e.message || "Failed to access camera and microphone.");
      }
      setStatus("error");
    }
  }, []);

  // ── Stop camera ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setIsMuted(false);
    setIsCameraOff(false);
    setStatus("idle");
    setError("");
  }, [localStream]);

  // ── Attach stream to video element ───────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  // ── Controls ─────────────────────────────────────────────
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

  // ── Loading / Not started state ──────────────────────────
  const isIdle = status === "idle" || (!localStream && status !== "error");

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />

      {/* Video preview (full screen when active) */}
      {localStream && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${isCameraOff ? "hidden" : ""}`}
        />
      )}

      {/* Camera off overlay */}
      {localStream && isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <span className="text-6xl">📷</span>
            <p className="text-lg text-gray-400 mt-3">Camera Off</p>
          </div>
        </div>
      )}

      {/* Idle / Start screen */}
      {!localStream && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white max-w-md px-6">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Camera Test</h1>
            <p className="text-gray-400 mb-8">
              Test your camera and microphone. No login required — just a local preview.
            </p>
            <button
              onClick={startCamera}
              className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 transition-colors shadow-lg"
            >
              Start Camera
            </button>
          </div>
        </div>
      )}

      {/* Error screen */}
      {error && !localStream && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white max-w-md px-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold mb-2">Camera Test</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startCamera}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">Camera Test</h1>
          <StatusBadge
            state={status}
            message={
              status === "active" && isMuted
                ? "Active (muted)"
                : status === "active" && isCameraOff
                  ? "Active (cam off)"
                  : undefined
            }
          />
        </div>
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>
      </div>

      {/* Bottom control bar (visible when active) */}
      {localStream && (
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

          {/* Camera toggle */}
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

          {/* Stop camera (red button) */}
          <button
            onClick={stopCamera}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
            title="Stop Camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
