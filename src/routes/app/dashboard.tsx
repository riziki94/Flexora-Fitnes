import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/user-actions";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      // Load dashboard data
      getDashboardData().then(setDashData).catch(console.error).finally(() => setLoading(false));
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/profile" className="text-sm text-gray-600 hover:text-[#1A56DB]">Profile</a>
            {isPt && (
              <a href="/app/pt/verify" className="text-sm text-gray-600 hover:text-[#1A56DB]">Verification</a>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || "Athlete"}!
          </h1>
          <p className="text-gray-500">
            {isPt ? "Personal Trainer Dashboard" : "Client Dashboard"}
          </p>
        </div>

        {isPt ? <PtDashboard data={dashData} /> : <ClientDashboard data={dashData} />}
      </main>
    </div>
  );
}

function ClientDashboard({ data }: { data: any }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Quick Stats */}
      <DashboardCard title="Subscription" className="md:col-span-2 lg:col-span-1">
        {data?.subscription ? (
          <div>
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {data.subscription.plan.toUpperCase()}
            </span>
            <p className="mt-2 text-sm text-gray-500">
              Active since {new Date(data.subscription.started_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">No active subscription</p>
            <a href="/#pricing" className="mt-2 inline-block text-sm font-medium text-[#1A56DB] hover:underline">
              View Plans →
            </a>
          </div>
        )}
      </DashboardCard>

      {/* Workout Plans */}
      <DashboardCard title="Workout Plans" className="md:col-span-2">
        {data?.workouts && data.workouts.length > 0 ? (
          <div className="space-y-3">
            {data.workouts.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{w.goal.replace("_", " ")}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(w.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No workout plans yet</p>
            <button className="mt-3 rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]">
              Create Your First Plan
            </button>
          </div>
        )}
      </DashboardCard>

      {/* Quick Actions */}
      <DashboardCard title="Quick Actions">
        <div className="space-y-2">
          <ActionLink href="/app/profile">Edit Profile</ActionLink>
          <ActionLink href="/#pricing">Upgrade Plan</ActionLink>
          <ActionLink href="/app/dashboard">Browse PTs</ActionLink>
        </div>
      </DashboardCard>
    </div>
  );
}

function PtDashboard({ data }: { data: any }) {
  const profile = data?.profile;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Verification Status */}
      <DashboardCard title="Verification Status">
        {profile ? (
          <div>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              profile.verification_status === "approved"
                ? "bg-green-100 text-green-700"
                : profile.verification_status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {profile.verification_status.toUpperCase()}
            </span>
            {profile.verification_status === "pending" && (
              <p className="mt-2 text-sm text-gray-500">Your documents are under review</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Complete your PT profile</p>
        )}
      </DashboardCard>

      {/* Stats */}
      <DashboardCard title="Your Stats">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Experience</span>
            <span className="font-medium">{profile?.years_of_experience || 0} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Education</span>
            <span className="font-medium">{profile?.education_location || "—"}</span>
          </div>
        </div>
      </DashboardCard>

      {/* Bookings */}
      <DashboardCard title="Upcoming Bookings" className="md:col-span-2 lg:col-span-1">
        {data?.bookings && data.bookings.length > 0 ? (
          <div className="space-y-3">
            {data.bookings.map((b: any) => (
              <div key={b.id} className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{b.client_name}</p>
                <p className="text-xs text-gray-500">{new Date(b.scheduled_at).toLocaleString()}</p>
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No upcoming bookings</p>
        )}
      </DashboardCard>

      {/* Quick Actions */}
      <DashboardCard title="Quick Actions">
        <div className="space-y-2">
          <ActionLink href="/app/profile">Edit Profile</ActionLink>
          <ActionLink href="/app/pt/verify">Verification Status</ActionLink>
          <ActionLink href="/app/dashboard">Browse Clients</ActionLink>
        </div>
      </DashboardCard>
    </div>
  );
}

function DashboardCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="block rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
    >
      {children} →
    </a>
  );
}
