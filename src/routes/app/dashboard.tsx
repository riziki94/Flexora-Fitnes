import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/user-actions";
import { FREE_TRIAL_DAYS, FREE_TRIAL_MESSAGE } from "~/lib/stripe";
import { useTranslation } from "~/lib/i18n";
import Avatar from "~/components/Avatar";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

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

      // Calculate trial days
      const trialStart = localStorage.getItem("flexora_trial_start");
      if (!trialStart) {
        const now = new Date().toISOString();
        localStorage.setItem("flexora_trial_start", now);
      }
      const start = new Date(trialStart || new Date().toISOString());
      const now = new Date();
      const daysElapsed = Math.floor(
        (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const remaining = Math.max(0, FREE_TRIAL_DAYS - daysElapsed);
      setTrialDaysLeft(remaining);

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
        <div className="text-gray-500">{t("dashboard.loading")}</div>
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
            <a href="/app/messages" className="text-sm text-gray-600 hover:text-[#1A56DB] relative">
              💬 {t("nav.messages") || "Meldinger"}
              <span id="dm-badge-dashboard" className="absolute -top-2 -right-5 hidden flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A56DB] text-[10px] font-bold text-white px-1">0</span>
            </a>
            <a href="/app/schedule" className="text-sm text-gray-600 hover:text-[#1A56DB]">{t("nav.schedule")}</a>
            <a href="/app/subscription" className="text-sm text-gray-600 hover:text-[#1A56DB]">{t("nav.subscription")}</a>
            <a href="/app/profile" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1A56DB]">
              <Avatar src={user?.profile_picture} name={user?.name} size={28} />
              {t("nav.profile")}
            </a>
            {isPt && (
              <>
                <a href="/app/pt/matches" className="text-sm text-gray-600 hover:text-[#1A56DB]">Matches</a>
                <a href="/app/pt/verify" className="text-sm text-gray-600 hover:text-[#1A56DB]">{t("nav.verification")}</a>
              </>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Trial Banner — show when no active subscription */}
        {!isPt && !dashData?.subscription && trialDaysLeft > 0 && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] p-5 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {t("dashboard.trialDaysLeft", {
                    days: trialDaysLeft,
                    daysLabel: trialDaysLeft === 1 ? t("dashboard.trialDaysLeft_1") : t("dashboard.trialDaysLeft_other"),
                  })}
                </p>
                <p className="text-sm text-blue-100">{FREE_TRIAL_MESSAGE}</p>
              </div>
              <a
                href="/app/subscription"
                className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1A56DB] hover:bg-blue-50 transition-colors text-center"
              >
                {t("dashboard.chooseSubscription")}
              </a>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("dashboard.welcome", { name: user?.name || "Athlete" })}
          </h1>
          <p className="text-gray-500">
            {isPt ? t("dashboard.ptDashboard") : t("dashboard.clientDashboard")}
          </p>
        </div>

        {isPt ? <PtDashboard data={dashData} /> : <ClientDashboard data={dashData} />}
      </main>
    </div>
  );
}

function ClientDashboard({ data }: { data: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Quick Stats */}
      <DashboardCard title={t("dashboard.subscription")} className="md:col-span-2 lg:col-span-1">
        {data?.subscription ? (
          <div>
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {data.subscription.plan.toUpperCase()}
            </span>
            <p className="mt-2 text-sm text-gray-500">
              {t("dashboard.activeSince")} {new Date(data.subscription.started_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">{t("dashboard.noSubscription")}</p>
            <a href="/app/subscription" className="mt-2 inline-block text-sm font-medium text-[#1A56DB] hover:underline">
              {t("dashboard.viewPlans")}
            </a>
          </div>
        )}
      </DashboardCard>

      {/* Workout Plans */}
      <DashboardCard title={t("dashboard.workoutPlans")} className="md:col-span-2">
        {data?.workouts && data.workouts.length > 0 ? (
          <div className="space-y-3">
            {data.workouts.map((w: any) => (
              <a
                key={w.id}
                href={`/app/workout/plans/${w.id}`}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-blue-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{w.goal.replace("_", " ")}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(w.created_at).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">{t("dashboard.noWorkoutPlans")}</p>
            <a
              href="/app/workout/plans/create"
              className="mt-3 inline-block rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              {t("dashboard.createFirstPlan")}
            </a>
          </div>
        )}
        <div className="mt-3">
          <a href="/app/workout/plans" className="text-sm font-medium text-[#1A56DB] hover:underline">
            {t("dashboard.viewAllPlans")}
          </a>
        </div>
      </DashboardCard>

      {/* Quick Actions */}
      <DashboardCard title={t("dashboard.quickActions")}>
        <div className="space-y-2">
          <ActionLink href="/app/schedule">{t("dashboard.weeklySchedule")}</ActionLink>
          <ActionLink href="/app/workout/plans/create">{t("dashboard.createWorkoutPlan")}</ActionLink>
          <ActionLink href="/app/profile">{t("dashboard.editProfile")}</ActionLink>
          <ActionLink href="/app/subscription">{t("dashboard.upgradePlan")}</ActionLink>
          <ActionLink href="/app/dashboard">{t("dashboard.browsePTs")}</ActionLink>
        </div>
      </DashboardCard>
    </div>
  );
}

function PtDashboard({ data }: { data: any }) {
  const { t } = useTranslation();
  const profile = data?.profile;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Verification Status */}
      <DashboardCard title={t("dashboard.verificationStatus")}>
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
              <p className="mt-2 text-sm text-gray-500">{t("dashboard.underReview")}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t("dashboard.completeProfile")}</p>
        )}
      </DashboardCard>

      {/* Stats */}
      <DashboardCard title={t("dashboard.yourStats")}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("dashboard.experience")}</span>
            <span className="font-medium">{profile?.years_of_experience || 0} {t("general.years")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("dashboard.education")}</span>
            <span className="font-medium">{profile?.education_location || "—"}</span>
          </div>
        </div>
      </DashboardCard>

      {/* Bookings */}
      <DashboardCard title={t("dashboard.upcomingBookings")} className="md:col-span-2 lg:col-span-1">
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
          <p className="text-sm text-gray-500">{t("dashboard.noBookings")}</p>
        )}
      </DashboardCard>

      {/* Quick Actions */}
      <DashboardCard title={t("dashboard.quickActions")}>
        <div className="space-y-2">
          <ActionLink href="/app/schedule">{t("dashboard.weeklySchedule")}</ActionLink>
          <ActionLink href="/app/pt/matches">Matches ⚡</ActionLink>
          <ActionLink href="/app/profile">{t("dashboard.editProfile")}</ActionLink>
          <ActionLink href="/app/pt/verify">{t("dashboard.verificationStatus")}</ActionLink>
          <ActionLink href="/app/dashboard">{t("dashboard.browseClients")}</ActionLink>
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
