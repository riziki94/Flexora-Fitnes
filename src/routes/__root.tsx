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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Flexora Fitnes — The World's First PT Marketplace" },
      {
        name: "description",
        content:
          "The world's first PT marketplace with AI-powered training. 3D muscle visualization, live form correction, voice guidance, and global competitions.",
      },
      // iOS PWA support
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Flexora" },
      { name: "theme-color", content: "#1A56DB" },
      // Apple Smart App Banner (set app-id when iOS app is published)
      { name: "apple-itunes-app", content: "app-id=PLACEHOLDER_APP_ID" },
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
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      // iOS splash screen link tags for all iPhone/iPad sizes
      // iPhone SE / iPod Touch (640x1136)
      { rel: "apple-touch-startup-image", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPhone 6/7/8 (750x1334)
      { rel: "apple-touch-startup-image", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPhone 6+/7+/8+ (1242x2208)
      { rel: "apple-touch-startup-image", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPhone X / XS (1125x2436)
      { rel: "apple-touch-startup-image", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPhone XR / 11 (828x1792)
      { rel: "apple-touch-startup-image", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPhone XS Max / 11 Pro Max (1242x2688)
      { rel: "apple-touch-startup-image", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPhone 12/13/14 (1170x2532)
      { rel: "apple-touch-startup-image", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPhone 12/13/14 Pro Max (1284x2778)
      { rel: "apple-touch-startup-image", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPhone 14 Pro (1179x2556)
      { rel: "apple-touch-startup-image", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)", href: "/marketing/hero-banner.png" },
      // iPad Mini / Air (1536x2048)
      { rel: "apple-touch-startup-image", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPad Pro 10.5" (1668x2224)
      { rel: "apple-touch-startup-image", media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPad Pro 11" (1668x2388)
      { rel: "apple-touch-startup-image", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
      // iPad Pro 12.9" (2048x2732)
      { rel: "apple-touch-startup-image", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)", href: "/marketing/hero-banner.png" },
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
                    // Listen for updates
                    reg.addEventListener('updatefound', function() {
                      var newWorker = reg.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New SW available — refresh to update');
                          }
                        });
                      }
                    });
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
