import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "~/lib/auth.tsx";
import { getProfile, SUBSCRIPTION_TIERS, type Profile } from "~/lib/subscription";

import ChatWidget from "~/components/ChatWidget";
import { LanguageProvider, useLanguage } from "~/lib/i18n.tsx";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "Kitozon — Sustainable Container Homes & Environmental Monitoring",
      },
      // PWA / theme
      { name: "theme-color", content: "#059669" },
      { name: "description", content: "Sustainable Container Homes & Environmental Monitoring" },
      // iOS / Safari
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Kitozon" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // PWA
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </RootDocument>
  );
}

function AppShell() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <ChatWidget />
    </>
  );
}

function Navbar() {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      getProfile({ data: { userId: user.id } })
        .then(setProfile)
        .catch(() => setProfile(null));
    } else {
      setProfile(null);
    }
  }, [user]);

  const linkClass =
    "text-gray-700 hover:text-emerald-600 font-medium transition-colors duration-200";
  const activeLinkClass = "text-emerald-600 font-semibold";

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
  };

  const tierKey = (profile?.subscription_tier || "").toLowerCase();
  const tierInfo =
    tierKey && SUBSCRIPTION_TIERS[tierKey as keyof typeof SUBSCRIPTION_TIERS]
      ? SUBSCRIPTION_TIERS[tierKey as keyof typeof SUBSCRIPTION_TIERS]
      : null;

  const tierBadgeColors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm pt-safe">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-emerald-600 transition-colors"
          >
            <img src="/images/logo-original.png" alt="Kitozon" className="h-10 sm:h-14 lg:h-16 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/zongosol"
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
            >
              Zongosol
            </Link>
            <Link
              to="/kitoslight"
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
            >
              Kitoslight
            </Link>
            <Link
              to="/pricing"
              className={linkClass}
              activeProps={{ className: activeLinkClass }}
            >
              {t("Pricing")}
            </Link>
            {/* Language Switcher */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setLang("en")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                  lang === "en"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                aria-label="English"
              >
                EN
              </button>
              <button
                onClick={() => setLang("no")}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                  lang === "no"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                aria-label="Norwegian"
              >
                NO
              </button>
            </div>
            {/* Auth area */}
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  {user.user_metadata?.full_name ||
                    user.email?.split("@")[0] ||
                    "User"}
                  {tierInfo && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tierBadgeColors[tierInfo.color] || "bg-gray-100 text-gray-700"}`}
                    >
                      {tierInfo.name}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors duration-200"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          {/* Mobile hamburger — min 44x44 tap target */}
          <button
            className="md:hidden rounded-lg p-3 text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu — slide-down animation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-gray-100 py-3 flex flex-col gap-1 pb-4 pb-safe">
            <Link
              to="/zongosol"
              className={linkClass + " px-3 py-3 rounded-lg hover:bg-gray-50 min-h-[44px] flex items-center"}
              onClick={() => setMobileOpen(false)}
            >
              Zongosol
            </Link>
            <Link
              to="/kitoslight"
              className={linkClass + " px-3 py-3 rounded-lg hover:bg-gray-50 min-h-[44px] flex items-center"}
              onClick={() => setMobileOpen(false)}
            >
              Kitoslight
            </Link>
            <Link
              to="/pricing"
              className={linkClass + " px-3 py-3 rounded-lg hover:bg-gray-50 min-h-[44px] flex items-center"}
              onClick={() => setMobileOpen(false)}
            >
              {t("Pricing")}
            </Link>

            <hr className="border-gray-100 my-1" />

            {/* Language Switcher (Mobile) */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-gray-400">{t("nav.language")}</span>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => { setLang("en"); setMobileOpen(false); }}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                    lang === "en"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => { setLang("no"); setMobileOpen(false); }}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                    lang === "no"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {user ? (
              <>
                <Link
                  to="/account"
                  className="px-3 py-3 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.account")}
                  {tierInfo && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tierBadgeColors[tierInfo.color] || "bg-gray-100 text-gray-700"}`}
                    >
                      {tierInfo.name}
                    </span>
                  )}
                </Link>
                <div className="px-3 py-2 text-sm font-medium text-gray-500">
                  {user.user_metadata?.full_name ||
                    user.email?.split("@")[0] ||
                    "User"}
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 text-center min-h-[44px]"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 text-center min-h-[44px] flex items-center justify-center"
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-8 mt-auto pb-safe">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Kitozon. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Scripts />
        {/* Register service worker for PWA offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('SW registered:', reg.scope); },
                    function(err) { console.log('SW registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
