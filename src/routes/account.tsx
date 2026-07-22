import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth.tsx";
import { getProfile, saveProfile, SUBSCRIPTION_TIERS, type Profile } from "~/lib/subscription";
import { formatPrice, formatPriceUsd } from "~/lib/currency";
import { useLanguage } from "~/lib/i18n.tsx";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

const COUNTRY_LIST = [
  "Norway", "Sweden", "Denmark", "Finland", "Iceland",
  "Germany", "Netherlands", "Belgium", "France", "Spain",
  "United Kingdom", "United States", "Canada", "Australia",
  "Other",
];

function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, currency } = useLanguage();
  const isNok = currency === "NOK";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [editMode, setEditMode] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCountry, setFormCountry] = useState("Norway");
  const [formPhone, setFormPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      getProfile({ data: { userId: user.id } })
        .then((p) => {
          setProfile(p);
          if (p) {
            setFormName(p.full_name || "");
            setFormCompany(p.company || "");
            setFormAddress(p.address || "");
            setFormCountry(p.country || "Norway");
            setFormPhone(p.phone || "");
          }
          setProfileLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setProfileLoading(false);
        });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !formName.trim() || !formAddress.trim()) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await saveProfile({
        data: {
          userId: user.id,
          full_name: formName.trim(),
          company: formCompany.trim() || undefined,
          address: formAddress.trim(),
          country: formCountry,
          phone: formPhone.trim(),
        },
      });
      if (result.ok) {
        setSuccessMsg("Profile saved successfully!");
        setEditMode(false);
        // Refresh profile
        const p = await getProfile({ data: { userId: user.id } });
        setProfile(p);
      } else {
        setError(result.error || "Failed to save profile");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
    setSaving(false);
  };

  if (authLoading || profileLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-gray-500">Loading account...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Sign in required
          </h1>
          <p className="mt-2 text-gray-600">
            Please sign in to view your account and subscription details.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const currentTier = (profile?.subscription_tier || "kitoslight").toLowerCase();
  const tierInfo = SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.kitoslight;

  const tierColorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <main className="flex-1 bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">My Account</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile and subscription.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Profile — Editable */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Customer Profile
                </h2>
                {!editMode && (
                  <button
                    onClick={() => {
                      setFormName(profile?.full_name || "");
                      setFormCompany(profile?.company || "");
                      setFormAddress(profile?.address || "");
                      setFormCountry(profile?.country || "Norway");
                      setFormPhone(profile?.phone || "");
                      setEditMode(true);
                    }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Ola Nordmann"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Company / Organization{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Bedrift AS"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Storgata 1, 0155 Oslo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      {COUNTRY_LIST.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="+47 912 34 567"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !formName.trim() || !formAddress.trim()}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Name</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.full_name || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.email || user.email || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Company</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.company || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Address</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.address || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Country</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.country || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Phone</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.phone || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <dt className="text-sm text-gray-500">Member since</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Subscription info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Subscription
              </h2>
              <div className="mt-4 flex items-center gap-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${tierColorMap[tierInfo.color] || "bg-gray-100 text-gray-700"}`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                  </span>
                  {tierInfo.name}
                </span>
                <span className="text-sm text-gray-500">
                  {isNok ? formatPrice(tierInfo.billingOptions.monthly.priceNok) : formatPriceUsd(tierInfo.billingOptions.monthly.priceNok)} {t("excl. VAT")}{isNok ? "/md" : "/mo"}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {tierInfo.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Change Plan */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Change Plan
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Upgrade or switch your subscription tier.
              </p>
              <div className="mt-4 space-y-3">
                {(Object.entries(SUBSCRIPTION_TIERS) as [string, typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS]][]).map(
                  ([key, tier]) => {
                    const isCurrent = tier.name.toLowerCase() === currentTier;
                    return (
                      <a
                        key={key}
                        href={tier.billingOptions.monthly.paymentLink}
                        className={`block w-full rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-all duration-200 ${
                          isCurrent
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        onClick={(e) => {
                          if (isCurrent) e.preventDefault();
                        }}
                      >
                        {isCurrent ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Current Plan
                          </span>
                        ) : (
                          <>Switch to {tier.name} — {isNok ? formatPrice(tier.billingOptions.monthly.priceNok) : formatPriceUsd(tier.billingOptions.monthly.priceNok)} {t("excl. VAT")}{isNok ? "/md" : "/mo"}</>
                        )}
                      </a>
                    );
                  },
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Actions</h2>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => signOut()}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
