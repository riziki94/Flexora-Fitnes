// Flexora Fitnes Service Worker — cache-first for app shell, network-first for data
const CACHE_NAME = 'flexora-v2';
const STATIC_CACHE = 'flexora-static-v2';
const IMAGE_CACHE = 'flexora-images-v2';

// App shell assets to precache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
];

// Static assets that rarely change (versioned by cache name)
const STATIC_ASSETS = [
  '/flexora-icon-48.png',
  '/flexora-icon-72.png',
  '/flexora-icon-96.png',
  '/flexora-icon-144.png',
  '/flexora-icon-168.png',
  '/flexora-icon-192.png',
  '/flexora-icon-512.png',
  '/favicon-32.png',
];

// Install: precache the app shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
    ]).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => !validCaches.includes(key)).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: is an image request?
function isImage(url) {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(url.pathname);
}

// Helper: is a navigation request?
function isNavigation(request) {
  return request.mode === 'navigate';
}

// Helper: is an API request?
function isApi(url) {
  return url.pathname.startsWith('/api/');
}

// Fetch: strategy varies by resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests: network-first, no caching
  if (isApi(url)) {
    return;
    // Let these go straight to network — they're dynamic
  }

  // Image requests: cache-first with network fallback
  if (isImage(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }

          const clone = response.clone();
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, clone);
          });

          return response;
        }).catch(() => {
          // Return a placeholder or just fail gracefully
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Navigation requests: network-first, fallback to cached shell
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        }
        return caches.match(request);
      }).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // Everything else (JS, CSS, fonts): cache-first with network update
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background sync for offline form submissions (future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      // Process any queued offline actions
      Promise.resolve()
    );
  }
});

// Push notification support (future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Flexora Fitnes';
  const options = {
    body: data.body || 'Your workout is ready!',
    icon: '/flexora-icon-192.png',
    badge: '/flexora-icon-72.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
