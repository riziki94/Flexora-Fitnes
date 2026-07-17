import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { registerUser } from "~/lib/auth-actions";
import { getPaymentLink, FREE_TRIAL_MESSAGE } from "~/lib/stripe";
import { useTranslation } from "~/lib/i18n";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  validateSearch: (search: Record<string, unknown>) => ({
    plan: (search.plan as string) || "",
  }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const search = Route.useSearch();
  const [role, setRole] = useState<"client" | "pt">("client");
  const [plan, setPlan] = useState(search.plan || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [birthday, setBirthday] = useState("");

  // PT fields
  const [certificationInfo, setCertificationInfo] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [educationLocation, setEducationLocation] = useState("");
  const [bio, setBio] = useState("");
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync plan from search params
  useEffect(() => {
    if (search.plan) {
      setPlan(search.plan);
      if (search.plan === "pt") {
        setRole("pt");
      }
    }
  }, [search.plan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (role === "pt" && !certificationInfo && !diplomaFile) {
      setError(t("auth.ptRequired"));
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        data: {
          email,
          password,
          name,
          role,
          country: country || undefined,
          birthday: birthday || undefined,
          certificationInfo: role === "pt" ? certificationInfo : undefined,
          yearsOfExperience: role === "pt" ? yearsOfExperience : undefined,
          educationLocation: role === "pt" ? educationLocation : undefined,
          bio: role === "pt" ? bio : undefined,
        },
      });

      // Store token
      if (typeof window !== "undefined") {
        localStorage.setItem("flexora_token", result.token);
        localStorage.setItem("flexora_user", JSON.stringify(result.user));
        document.cookie = `flexora_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        // Store selected plan for subscription setup
        const effectivePlan = plan || (role === "pt" ? "pt" : "basis");
        localStorage.setItem("flexora_pending_plan", effectivePlan);
      }

      // Redirect to Stripe payment link
      const effectivePlan = plan || (role === "pt" ? "pt" : "basis");
      const paymentLink = getPaymentLink(effectivePlan);

      if (typeof window !== "undefined") {
        window.open(paymentLink, "_blank", "noopener,noreferrer");
      }

      navigate({ to: "/app/dashboard" });
    } catch (e: any) {
      setError(e.message || t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(newRole: "client" | "pt") {
    setRole(newRole);
    if (newRole === "pt") {
      setPlan("pt");
    } else if (plan === "pt") {
      setPlan("");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-2xl font-light text-gray-500">Fitnes</span>
          </a>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("auth.createAccount")}</h1>
          <p className="mb-6 text-sm font-medium text-[#1A56DB]">{FREE_TRIAL_MESSAGE}</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange("client")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                role === "client"
                  ? "bg-[#1A56DB] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("auth.imClient")}
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("pt")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                role === "pt"
                  ? "bg-[#1A56DB] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("auth.imPT")}
            </button>
          </div>

          {/* Plan selector (clients only) */}
          {role === "client" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("auth.selectPlan")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "basis", label: t("pricing.basis"), price: "149 kr" },
                  { key: "hybrid", label: t("pricing.hybrid"), price: "249 kr" },
                  { key: "premium", label: t("pricing.premium"), price: "399 kr" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    className={`rounded-lg border px-3 py-3 text-center text-sm transition-colors ${
                      plan === p.key
                        ? "border-[#1A56DB] bg-blue-50 text-[#1A56DB] font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-xs mt-0.5">{p.price}/mnd</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.fullName")}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                placeholder={t("auth.passwordMinChars")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("auth.country")}
                </label>
                <input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("auth.birthday")}
                </label>
                <input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>
            </div>

            {/* PT-only fields */}
            {role === "pt" && (
              <div className="space-y-4 rounded-lg border border-[#3B82F6]/30 bg-blue-50/50 p-4">
                <p className="text-sm font-medium text-[#1A56DB]">{t("auth.professionalInfo")}</p>

                <div>
                  <label htmlFor="certification" className="block text-sm font-medium text-gray-700 mb-1">
                    {t("auth.certificationInfo")}
                  </label>
                  <textarea
                    id="certification"
                    value={certificationInfo}
                    onChange={(e) => setCertificationInfo(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    placeholder={t("auth.certPlaceholder")}
                  />
                </div>

                <div>
                  <label htmlFor="diploma" className="block text-sm font-medium text-gray-700 mb-1">
                    {t("auth.uploadDiploma")}
                  </label>
                  <input
                    id="diploma"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDiplomaFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#1A56DB] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1E40AF]"
                  />
                  {diplomaFile && (
                    <p className="mt-1 text-xs text-green-600">Selected: {diplomaFile.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      {t("auth.yearsExperience")}
                    </label>
                    <input
                      id="experience"
                      type="number"
                      min={0}
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    />
                  </div>
                  <div>
                    <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                      {t("auth.educationLocation")}
                    </label>
                    <input
                      id="education"
                      type="text"
                      value={educationLocation}
                      onChange={(e) => setEducationLocation(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    {t("auth.bio")}
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    placeholder={t("auth.bioPlaceholder")}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1A56DB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
            >
              {loading
                ? t("auth.creatingAccount")
                : t("auth.startFreeTrial", {
                    plan: role === "pt" ? t("pricing.ptPlan") : plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : t("auth.selectPlan"),
                  })}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t("auth.haveAccount")}{" "}
            <a href="/login" className="font-medium text-[#1A56DB] hover:text-[#1E40AF]">
              {t("auth.signIn")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
