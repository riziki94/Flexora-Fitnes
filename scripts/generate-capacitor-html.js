#!/usr/bin/env bun
/**
 * Post-build script: generates dist/client/index.html for Capacitor.
 * TanStack Start (SSR) does not emit an index.html — this creates one
 * that loads the built client JS/CSS assets so Capacitor can wrap them.
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = join(import.meta.dirname, "..", "dist", "client");
const ASSETS = join(DIST, "assets");

async function main() {
  const files = await readdir(ASSETS);

  // Find the main CSS bundle
  const cssFile = files.find((f) => f.startsWith("app-") && f.endsWith(".css"));
  if (!cssFile) {
    console.error("ERROR: Could not find app-*.css in dist/client/assets/");
    process.exit(1);
  }

  // Find the main client entry JS (the largest index-*.js file, not a route chunk)
  const jsFiles = files.filter((f) => f.startsWith("index-") && f.endsWith(".js"));
  // Route chunks tend to be smaller; the main entry is usually 500KB+
  const jsStats = await Promise.all(
    jsFiles.map(async (f) => ({ name: f, size: (await stat(join(ASSETS, f))).size }))
  );
  jsStats.sort((a, b) => a.size - b.size);
  const mainJs = jsStats.pop()?.name; // largest by file size
  if (!mainJs) {
    console.error("ERROR: Could not find index-*.js in dist/client/assets/");
    process.exit(1);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#059669" />
  <meta name="description" content="Sustainable Container Homes &amp; Environmental Monitoring" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Kitozon" />
  <title>Kitozon — Sustainable Container Homes &amp; Environmental Monitoring</title>
  <link rel="stylesheet" href="/assets/${cssFile}" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  <link rel="modulepreload" href="/assets/${mainJs}" />
  <style>
    /* Splash / loading state while JS boots */
    #capacitor-splash {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #f0fdf4 100%);
      font-family: system-ui, -apple-system, sans-serif;
    }
    #capacitor-splash .loader {
      text-align: center;
    }
    #capacitor-splash .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #059669;
      color: white;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    #capacitor-splash .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #d1fae5;
      border-top-color: #059669;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body class="flex min-h-dvh flex-col">
  <div id="capacitor-splash">
    <div class="loader">
      <div class="logo">K</div>
      <div class="spinner"></div>
    </div>
  </div>

  <script type="module" src="/assets/${mainJs}"></script>
  <script>
    // Remove splash once React mounts
    var observer = new MutationObserver(function () {
      var splash = document.getElementById('capacitor-splash');
      if (splash && document.querySelector('nav')) {
        splash.remove();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Fallback: remove splash after 8 seconds
    setTimeout(function () {
      var splash = document.getElementById('capacitor-splash');
      if (splash) splash.remove();
    }, 8000);
  </script>
</body>
</html>`;

  const outPath = join(DIST, "index.html");
  await writeFile(outPath, html, "utf-8");
  console.log(`Generated ${outPath}`);
  console.log(`  CSS: /assets/${cssFile}`);
  console.log(`  JS:  /assets/${mainJs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
