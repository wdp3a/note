// BCS403 Java PWA – Service Worker
// Cache-first strategy for full offline support

const CACHE_NAME = 'bcs403-java-v1';
const STATIC_ASSETS = [
  './java2.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Recursive:wght@400;600;700&display=swap'
];

// ── Install: pre-cache all static assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets immediately; log but don't fail on external font CDN
      const local = STATIC_ASSETS.filter(u => !u.startsWith('http'));
      const external = STATIC_ASSETS.filter(u => u.startsWith('http'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(external.map(u => cache.add(u)))
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Cache successful responses (not opaque/error)
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return main page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./java2.html');
          }
        });
    })
  );
});
