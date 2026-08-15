import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/user-actions";
import { getReferralStats } from "~/lib/referral-actions";
import { FREE_TRIAL_DAYS, FREE_TRIAL_MESSAGE, getPaymentLink } from "~/lib/stripe";
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
  const [refStats, setRefStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

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
      getDashboardData().then((data) => {
        setDashData(data);
        // Trial days from the server's subscription expiry (source of truth).
        // Falls back to the localStorage marker only for legacy users without a
        // server subscription.
        const sub = data?.subscription as any;
        if (sub?.expires_at && sub.status !== "expired") {
          const now = new Date().getTime();
          const expires = new Date(String(sub.expires_at).replace(" ", "T")).getTime();
          setTrialDaysLeft(Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24))));
        } else if (!sub) {
          const trialStart = localStorage.getItem("flexora_trial_start");
          if (!trialStart) {
            const nowIso = new Date().toISOString();
            localStorage.setItem("flexora_trial_start", nowIso);
          }
          const start = new Date(trialStart || new Date().toISOString());
          const now = new Date();
          const daysElapsed = Math.floor(
            (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          );
          setTrialDaysLeft(Math.max(0, FREE_TRIAL_DAYS - daysElapsed));
        }
      }).catch(console.error).finally(() => setLoading(false));

      // Load referral stats
      getReferralStats().then(setRefStats).catch(() => {});
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

  function copyReferralLink() {
    if (refStats?.referralLink) {
      navigator.clipboard.writeText(refStats.referralLink).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }).catch(() => {});
    }
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
        {/* Trial Banner — active free trial */}
        {!isPt && dashData?.subscription?.status === "trial" && trialDaysLeft > 0 && (
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

        {/* Expired trial banner — honest: trial is over, continue with the real link */}
        {!isPt && dashData?.subscription?.status === "expired" && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-5 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold">Prøvetiden er over</p>
                <p className="text-sm text-red-100">
                  Fortsett med {planDisplayName(dashData.subscription.plan)} for å beholde alle tjenestene dine.
                </p>
              </div>
              <button
                onClick={() => window.open(getPaymentLink(dashData.subscription.plan), "_blank", "noopener,noreferrer")}
                className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-center"
              >
                Fortsett med {planDisplayName(dashData.subscription.plan)} →
              </button>
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

        {isPt ? <PtDashboard data={dashData} refStats={refStats} copyReferralLink={copyReferralLink} copySuccess={copySuccess} /> : <ClientDashboard data={dashData} refStats={refStats} copyReferralLink={copyReferralLink} copySuccess={copySuccess} />}
      </main>
    </div>
  );
}

function ClientDashboard({ data, refStats, copyReferralLink, copySuccess }: { data: any; refStats: any; copyReferralLink: () => void; copySuccess: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Quick Stats */}
      <DashboardCard title={t("dashboard.subscription")} className="md:col-span-2 lg:col-span-1">
        {data?.subscription?.status === "expired" ? (
          <div>
            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {data.subscription.plan.toUpperCase()} — PRØVETIDEN ER OVER
            </span>
            <p className="mt-2 text-sm text-gray-500">
              Fortsett med {planDisplayName(data.subscription.plan)} for å beholde alle tjenestene.
            </p>
            <button
              onClick={() => window.open(getPaymentLink(data.subscription.plan), "_blank", "noopener,noreferrer")}
              className="mt-3 inline-block rounded-full bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Fortsett med {planDisplayName(data.subscription.plan)} →
            </button>
          </div>
        ) : data?.subscription ? (
          <div>
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {data.subscription.plan.toUpperCase()}
              {data.subscription.status === "trial" ? " — PRØVEPERIODE" : ""}
            </span>
            <p className="mt-2 text-sm text-gray-500">
              {t("dashboard.activeSince")} {new Date(data.subscription.started_at).toLocaleDateString()}
            </p>
            <a href="/app/subscription" className="mt-2 inline-block text-sm font-medium text-[#1A56DB] hover:underline">
              {t("dashboard.viewPlans")}
            </a>
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

      {/* Referral Card */}
      <ReferralCard refStats={refStats} copyReferralLink={copyReferralLink} copySuccess={copySuccess} className="md:col-span-2 lg:col-span-2" />

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

function PtDashboard({ data, refStats, copyReferralLink, copySuccess }: { data: any; refStats: any; copyReferralLink: () => void; copySuccess: boolean }) {
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

      {/* Referral Card */}
      <ReferralCard refStats={refStats} copyReferralLink={copyReferralLink} copySuccess={copySuccess} className="md:col-span-2 lg:col-span-1" />

      {/* Bookings */}
      <DashboardCard title={t("dashboard.upcomingBookings")} className="md:col-span-2 lg:col-span-2">
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

function planDisplayName(key: string): string {
  if (key === "pt") return "PT";
  return key.charAt(0).toUpperCase() + key.slice(1);
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
      {children} &rarr;
    </a>
  );
}

function ReferralCard({ refStats, copyReferralLink, copySuccess, className = "" }: { refStats: any; copyReferralLink: () => void; copySuccess: boolean; className?: string }) {
  const referralCount = refStats?.referralCount || 0;
  const referralLink = refStats?.referralLink || "";
  const referralCode = refStats?.referralCode || "";

  // Rewards thresholds
  const nextThreshold = referralCount < 3 ? 3 : referralCount < 5 ? 5 : referralCount < 10 ? 10 : 0;
  const rewardText = referralCount < 3
    ? "Invite 3 friends = 1 month free"
    : referralCount < 5
    ? "Invite 5 friends = Premium upgrade"
    : referralCount < 10
    ? "Invite 10 friends = 3 months free"
    : "You've unlocked all rewards!";

  const progressPct = referralCount >= 10 ? 100 : (referralCount / nextThreshold) * 100;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Referral Program</h3>

      {/* Referral link */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Your referral link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 focus:outline-none"
          />
          <button
            onClick={copyReferralLink}
            className="rounded-lg bg-[#1A56DB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] transition-colors whitespace-nowrap"
          >
            {copySuccess ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-[#1A56DB]">{referralCount}</p>
          <p className="text-xs text-gray-500">Signups</p>
        </div>
        <div className="flex-1 rounded-lg bg-green-50 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{referralCount >= 3 ? Math.floor(referralCount / 3) : 0}</p>
          <p className="text-xs text-gray-500">Rewards earned</p>
        </div>
      </div>

      {/* Rewards progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">{referralCount} / {nextThreshold || referralCount} referrals</span>
          <span className="font-medium text-[#1A56DB]">{rewardText}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
