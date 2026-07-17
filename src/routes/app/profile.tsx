import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/user-actions";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      setUser(JSON.parse(stored));
      getDashboardData().then(setData).catch(console.error).finally(() => setLoading(false));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isPt = user?.role === "pt";
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
            {isPt && (
              <a href="/app/pt/verify" className="text-sm text-gray-600 hover:text-[#1A56DB]">Verification</a>
            )}
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">My Profile</h1>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Name</label>
                <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Role</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Member Since</label>
                <p className="mt-1 text-sm text-gray-900">
                  {data?.user?.id ? "Active" : "New member"}
                </p>
              </div>
            </div>
          </div>

          {/* PT Profile (if PT) */}
          {isPt && profile && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Professional Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Certification</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.certification_info || "Not provided"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Experience</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.years_of_experience} years</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Education</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.education_location || "Not provided"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Verification</label>
                  <p className="mt-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.verification_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : profile.verification_status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {profile.verification_status}
                    </span>
                  </p>
                </div>
              </div>
              {profile.bio && (
                <div className="mt-4">
                  <label className="block text-xs font-medium uppercase text-gray-400">Bio</label>
                  <p className="mt-1 text-sm text-gray-700">{profile.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Subscription info (if client) */}
          {!isPt && data?.subscription && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Subscription</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 uppercase">
                    {data.subscription.plan}
                  </span>
                  <p className="mt-1 text-sm text-gray-500">
                    Active since {new Date(data.subscription.started_at).toLocaleDateString()}
                  </p>
                </div>
                <a href="/#pricing" className="text-sm font-medium text-[#1A56DB] hover:underline">
                  Change Plan
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
