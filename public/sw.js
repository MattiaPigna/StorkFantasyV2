const CACHE_NAME = "storkleague-v2";
const STATIC_EXTENSIONS = [".js", ".css", ".woff2", ".woff", ".ttf", ".png", ".jpg", ".webp", ".svg", ".ico"];

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") ||
    STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

// Install: skip waiting immediately so new SW takes over ASAP
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: delete old caches and claim clients right away
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // Static assets (JS/CSS with content hash): cache first, then network
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  } else {
    // HTML pages and API calls: always network first, no caching
    // Falls back to cache only if fully offline
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
