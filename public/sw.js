// Kitozon Service Worker
// Cache-first for static assets, network-first for API calls

const CACHE_NAME = "kitozon-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for dynamic/API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApiCall =
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("supabase") ||
    url.pathname.startsWith("/_server/");

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  if (isApiCall) {
    // Network-first for API calls
    event.respondWith(networkFirst(event.request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(event.request));
  } else {
    // Network-first for navigation/document requests
    event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If it's an image, return a placeholder
    if (request.destination === "image") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#e5e7eb" width="200" height="200"/><text x="100" y="105" text-anchor="middle" fill="#9ca3af" font-size="20">Offline</text></svg>',
        { headers: { "Content-Type": "image/svg+xml" } }
      );
    }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // If this is a navigation request, return the offline page
    if (request.mode === "navigate") {
      const offlineCache = await caches.match("/offline");
      if (offlineCache) return offlineCache;

      // Fallback offline HTML
      return new Response(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kitozon — Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#111827}main{text-align:center;padding:2rem}.logo{width:80px;height:80px;background:#059669;border-radius:20px;display:flex;align-items:center;justify-content:center;color:white;font-size:40px;font-weight:bold;margin:0 auto 1.5rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#6b7280;margin-bottom:1.5rem}button{background:#059669;color:white;border:none;padding:12px 32px;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer}button:hover{background:#047857}</style></head><body><main><div class="logo">K</div><h1>You're offline</h1><p>Please check your internet connection and try again.</p><button onclick="location.reload()">Retry</button></main></body></html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    return new Response("Offline", { status: 503 });
  }
}
