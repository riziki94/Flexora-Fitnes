import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "~/lib/auth.tsx";
import { getDevices, type DbDevice } from "~/lib/db-devices";
import { setupDatabase } from "~/lib/db-setup";
import {
  getProfile,
  getUsers,
  getDashboardStats,
  getEsgReports,
  type Profile,
  type EsgReport,
  type DashboardStats,
} from "~/lib/db-admin";
import { StatsRow } from "~/components/dashboard/StatsRow";
import { DevicePanel } from "~/components/dashboard/DevicePanel";
import { EsgPanel } from "~/components/dashboard/EsgPanel";
import { IpPanel } from "~/components/dashboard/IpPanel";
import { UsersPanel } from "~/components/dashboard/UsersPanel";
import { SubscriptionsPanel } from "~/components/dashboard/SubscriptionsPanel";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

// ── Main Page ────────────────────────────────────────────────────────
function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tierLoading, setTierLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTierLoading(false);
      return;
    }
    getProfile({ userId: user.id })
      .then((p) => setProfile(p))
      .finally(() => setTierLoading(false));
  }, [user]);

  // Redirect non-admin users to subscribe page
  useEffect(() => {
    if (tierLoading || authLoading) return;
    if (!user) return;
    const tier = profile?.subscription_tier ?? "none";
    if (tier !== "dashboard") {
      navigate({ to: "/subscribe" });
    }
  }, [tierLoading, authLoading, user, profile, navigate]);

  if (authLoading || tierLoading) {
    return (
      <main className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access the admin dashboard.</p>
          <Link to="/subscribe" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            View Plans
          </Link>
        </div>
      </main>
    );
  }

  const tier = profile?.subscription_tier ?? "none";
  const isAdmin = tier === "dashboard";

  if (!isAdmin) {
    // Redirect is handled in useEffect above; show loading while redirecting
    return (
      <main className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Redirecting to subscription plans...</span>
        </div>
      </main>
    );
  }

  return <AdminDashboard userId={user.id} />;
}

// ── Full Admin Dashboard ─────────────────────────────────────────────
function AdminDashboard({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState("devices");
  const [devices, setDevices] = useState<DbDevice[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [esgReports, setEsgReports] = useState<EsgReport[]>([]);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [setupMsg, setSetupMsg] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const setupResult = await setupDatabase();
        if (setupResult.ok) {
          setDbReady(true);
          setSetupMsg(setupResult.message ?? "Database ready");
        } else {
          setDbReady(false);
          setSetupMsg(setupResult.error ?? "Database setup failed");
        }

        const [deviceData, userData, statsData, reportData] = await Promise.all([
          getDevices(),
          getUsers(),
          getDashboardStats(),
          getEsgReports(),
        ]);
        setDevices(deviceData);
        setUsers(userData);
        setStats(statsData);
        setEsgReports(reportData);
      } catch {
        setDbReady(false);
        setSetupMsg("Could not connect to database");
      } finally {
        setDataLoaded(true);
      }
    };
    init();
  }, [refreshKey]);

  const refreshAll = useCallback(() => setRefreshKey((k) => k + 1), []);

  const tabs = [
    { id: "devices", label: "Devices", count: devices.length },
    { id: "esg", label: "ESG Reports", count: esgReports.length },
    { id: "ip", label: "IP Integration", count: devices.filter((d) => d.ip_address).length },
    { id: "users", label: "Users", count: users.length },
    { id: "subscriptions", label: "Subscriptions" },
  ];

  return (
    <main className="flex-1 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Full platform control — devices, ESG, users, subscriptions</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Dashboard Tier
            </span>
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* DB Status */}
        {setupMsg && (
          <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${dbReady ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            {setupMsg}
          </div>
        )}

        {/* Stats Cards */}
        <StatsRow stats={stats} loading={!dataLoaded} />

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-gray-200">
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${activeTab === tab.id ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "devices" && <DevicePanel devices={devices} onRefresh={refreshAll} />}
          {activeTab === "esg" && <EsgPanel userId={userId} devices={devices} reports={esgReports} onRefresh={refreshAll} />}
          {activeTab === "ip" && <IpPanel devices={devices} onRefresh={refreshAll} />}
          {activeTab === "users" && <UsersPanel users={users} onRefresh={refreshAll} />}
          {activeTab === "subscriptions" && <SubscriptionsPanel users={users} />}
        </div>
      </div>
    </main>
  );
}
