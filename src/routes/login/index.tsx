import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "~/lib/auth";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Sign Up form state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: err } = await signIn(signInEmail, signInPassword);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      navigate({ to: "/" });
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (signUpPassword !== signUpConfirm) {
      setError("Passwords do not match");
      return;
    }
    if (signUpPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!signUpName.trim()) {
      setError("Full name is required");
      return;
    }

    setSubmitting(true);
    const { error: err } = await signUp(
      signUpEmail,
      signUpPassword,
      signUpName.trim(),
    );
    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      setSuccessMsg(
        "Account created! Check your email for a confirmation link, or sign in below.",
      );
      // Clear form
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpConfirm("");
      setTab("signin");
    }
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 outline-none transition-colors";

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50 py-12 px-4 pb-safe">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold text-2xl text-gray-900 hover:text-emerald-600 transition-colors"
          >
            <img src="/images/logo-original.png" alt="Kitozon" className="h-16 w-auto object-contain" />
          </Link>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-lg">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-8">
            <button
              onClick={() => {
                setTab("signin");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === "signin"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === "signup"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Success message */}
          {successMsg && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Sign In Form ─────────────────────────────── */}
          {tab === "signin" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Sign in to your Kitozon account
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSignIn}>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    onClick={(e) => {
                      e.preventDefault();
                      setError(
                        "Password reset coming soon. Please contact support.",
                      );
                    }}
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {/* Social login (decorative for now) */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                    onClick={() =>
                      setError("Google sign-in coming soon.")
                    }
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                    onClick={() =>
                      setError("GitHub sign-in coming soon.")
                    }
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Sign Up Form ─────────────────────────────── */}
          {tab === "signup" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center">
                Create an account
              </h1>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Start designing your sustainable container home
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSignUp}>
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="signUpEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="signUpEmail"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="signUpPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="signUpPassword"
                    type="password"
                    required
                    placeholder="Min. 6 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="signUpConfirm"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm password
                  </label>
                  <input
                    id="signUpConfirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signUpConfirm}
                    onChange={(e) => setSignUpConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setTab("signin");
                    setError("");
                  }}
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>

        {/* Subscription info */}
        <div className="mt-8 grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            {
              name: "Kitoslight",
              desc: "Environmental monitoring — 1 499 kr/md",
              dotClass: "bg-blue-500",
            },
            {
              name: "Zongosol",
              desc: "Container home design tool — 2 499 kr/md",
              dotClass: "bg-emerald-500",
            },
            {
              name: "Dashboard",
              desc: "Full admin panel & ESG reports — 4 999 kr/md",
              dotClass: "bg-purple-500",
            },
          ].map((sub) => (
            <div
              key={sub.name}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white/60 px-4 py-3"
            >
              <div className={`h-3 w-3 rounded-full ${sub.dotClass}`} />
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  {sub.name}
                </span>
                <span className="ml-2 text-xs text-gray-500">{sub.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
