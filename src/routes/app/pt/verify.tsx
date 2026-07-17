import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/user-actions";

export const Route = createFileRoute("/app/pt/verify")({
  component: PtVerifyPage,
});

function PtVerifyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== "pt") {
      navigate({ to: "/app/dashboard" });
      return;
    }
    setUser(parsed);
    getDashboardData().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  function handleUpload() {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }
    // For now, we simulate the upload — in production this would go to S3 or similar
    setMessage("Diploma uploaded successfully! Your verification is now pending review.");
    setFile(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const profile = data?.profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/profile" className="text-sm text-gray-600 hover:text-[#1A56DB]">Profile</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">PT Verification</h1>

        {/* Profile Picture Warning */}
        {(!user?.profile_picture || user.profile_picture === "") && (
          <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Profilbilde kreves</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Du må laste opp et profilbilde før profilen din blir synlig for kunder. 
                  Gå til{" "}
                  <a href="/app/profile" className="font-medium text-[#1A56DB] underline hover:text-[#1E40AF]">
                    profilsiden
                  </a>{" "}
                  for å laste opp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Verification Status</h2>
          {profile ? (
            <div>
              <div className="flex items-center gap-3">
                <span className={`inline-block h-3 w-3 rounded-full ${
                  profile.verification_status === "approved"
                    ? "bg-green-500"
                    : profile.verification_status === "rejected"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`} />
                <span className="text-lg font-medium capitalize">
                  {profile.verification_status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {profile.verification_status === "pending" && "Your documents are being reviewed by our team. This typically takes 1-3 business days."}
                {profile.verification_status === "approved" && "Your profile is verified! Clients can now find and book you."}
                {profile.verification_status === "rejected" && "Your verification was not approved. Please upload updated documents below."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Complete your PT profile registration to begin verification.</p>
          )}
        </div>

        {/* Upload Diploma */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload Diploma / Certificate</h2>
          <p className="mb-4 text-sm text-gray-500">
            Upload your PT certification, diploma, or other qualifying documents. Accepted formats: PDF, JPG, PNG.
          </p>

          {message && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-[#1A56DB]/50 transition-colors">
              <svg className="mx-auto mb-3 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-[#1A56DB] hover:text-[#1E40AF]">
                  Click to upload
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">PDF, JPG or PNG (max. 10MB)</p>
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <svg className="h-5 w-5 text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">{file.name}</span>
                <button onClick={() => setFile(null)} className="ml-auto text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file}
              className="rounded-full bg-[#1A56DB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
            >
              Upload for Verification
            </button>
          </div>
        </div>

        {/* Current Documents */}
        {profile?.certification_info && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Submitted Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Certification:</span>
                <p className="mt-0.5 text-gray-500">{profile.certification_info}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Experience:</span>
                <p className="mt-0.5 text-gray-500">{profile.years_of_experience} years</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Education:</span>
                <p className="mt-0.5 text-gray-500">{profile.education_location || "Not provided"}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
