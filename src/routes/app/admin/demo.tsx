import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { activateAdminDemo } from "~/lib/admin-demo-actions";

export const Route = createFileRoute("/app/admin/demo")({
  component: AdminDemoPage,
});

function AdminDemoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    async function run() {
      try {
        const result = await activateAdminDemo();

        if (typeof window !== "undefined") {
          localStorage.setItem("flexora_token", result.token);
          localStorage.setItem("flexora_user", JSON.stringify(result.user));
          document.cookie = `flexora_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        }

        setDetails(result);
        setStatus("done");

        // Short delay so the user sees the success screen, then redirect
        setTimeout(() => {
          navigate({ to: "/app/dashboard" });
        }, 1200);
      } catch (e: any) {
        setErrorMsg(e.message || "Failed to activate admin demo");
        setStatus("error");
      }
    }

    run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-6">
          <span className="text-3xl font-bold text-[#1A56DB]">Flexora</span>
          <span className="text-3xl font-light text-gray-500"> Fitnes</span>
        </div>

        {status === "loading" && (
          <div className="rounded-2xl bg-white p-10 shadow-lg ring-1 ring-gray-100">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#1A56DB] border-t-transparent" />
            <h2 className="text-lg font-semibold text-gray-800">Setting up admin demo…</h2>
            <p className="mt-2 text-sm text-gray-500">
              Creating admin account, seeding test data, and logging you in.
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-2xl bg-white p-10 shadow-lg ring-1 ring-gray-100">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-green-700">Admin Demo Ready!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Logged in as <strong>admin@flexora.fitnes</strong>
            </p>
            {details && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-600">
                <p className="font-medium mb-1">Seeded data:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>{details.seeded.pts} verified PTs with profiles</li>
                  <li>{details.seeded.planExercises} exercises in workout plan</li>
                  <li>{details.seeded.bookings} bookings (past + upcoming)</li>
                  <li>{details.seeded.speedDateSlots} speed-date slots</li>
                  <li>Hybrid subscription (active)</li>
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs text-gray-400">Redirecting to dashboard…</p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-white p-10 shadow-lg ring-1 ring-gray-100">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-700">Setup Failed</h2>
            <p className="mt-2 text-sm text-red-500">{errorMsg}</p>
            <button
              onClick={() => {
                setStatus("loading");
                setErrorMsg("");
                window.location.reload();
              }}
              className="mt-4 rounded-full bg-[#1A56DB] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
