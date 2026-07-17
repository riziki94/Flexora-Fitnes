import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import ChatWidget from "~/components/ChatWidget";
import { I18nProvider } from "~/lib/i18n";

import appCss from "~/styles/app.css?url";
import favicon16 from "~/assets/favicon-16.png";
import favicon32 from "~/assets/favicon-32.png";
import faviconSvg from "~/assets/favicon.svg";
import faviconIco from "~/assets/favicon.ico";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Flexora Fitnes — Global PT Marketplace & AI-Powered Fitness" },
      {
        name: "description",
        content:
          "The world's first two-sided PT marketplace with AI-powered training. 3D muscle visualization, live form correction, voice guidance, and global competitions.",
      },
      // iOS PWA support
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#1A56DB" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: faviconSvg },
      { rel: "icon", type: "image/png", sizes: "16x16", href: favicon16 },
      { rel: "icon", type: "image/png", sizes: "32x32", href: favicon32 },
      { rel: "shortcut icon", href: faviconIco },
      // PWA manifest
      { rel: "manifest", href: "/manifest.json" },
      // iOS apple-touch-icon
      { rel: "apple-touch-icon", href: "/flexora-icon.png" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <I18nProvider>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </I18nProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <ChatWidget />
        <Scripts />
        {/* Service Worker registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
