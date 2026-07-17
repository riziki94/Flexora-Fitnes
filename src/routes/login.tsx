import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { loginUser } from "~/lib/auth-actions";
import { useTranslation } from "~/lib/i18n";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ref_pt: (search.ref_pt as string) || "",
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginUser({ data: { email, password } });
      // Store token in localStorage for client-side access
      if (typeof window !== "undefined") {
        localStorage.setItem("flexora_token", result.token);
        localStorage.setItem("flexora_user", JSON.stringify(result.user));
        // Also set as cookie via document.cookie for SSR
        document.cookie = `flexora_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
      // If referred by PT, redirect to PT profile
      if (search.ref_pt) {
        navigate({ to: `/app/pt/$id`, params: { id: search.ref_pt }, search: { welcome: "1" } });
      } else {
        navigate({ to: "/app/dashboard" });
      }
    } catch (e: any) {
      setError(e.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-2xl font-light text-gray-500">Fitnes</span>
          </a>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("auth.signIn")}</h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder={t("auth.emailPlaceholder")}
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
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                placeholder={t("auth.passwordPlaceholder")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1A56DB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
            >
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t("auth.noAccount")}{" "}
            <a href={`/register${search.ref_pt ? `?ref_pt=${search.ref_pt}` : ""}`} className="font-medium text-[#1A56DB] hover:text-[#1E40AF]">
              {t("auth.signUp")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
