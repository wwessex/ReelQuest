/* ReelQuest service worker
   - App shell cached for offline
   - Stale-while-revalidate for TMDB API + images
*/
const VERSION = "rq-sw-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === VERSION ? Promise.resolve() : caches.delete(k))));
    self.clients.claim();
  })());
});

// Basic stale-while-revalidate helper
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    // Cache successful responses (including opaque)
    if (response && (response.status === 200 || response.type === "opaque")) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || cached;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin for app shell navigation
  const isSameOrigin = url.origin === self.location.origin;

  // App shell: serve index.html for navigation requests
  if (isSameOrigin && req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match("./index.html");
      try {
        const fresh = await fetch(req);
        // If fetching index works, keep it updated
        if (fresh && fresh.status === 200) {
          cache.put("./index.html", fresh.clone()).catch(() => {});
          return fresh;
        }
      } catch (e) {}
      return cached || (await fetch(req));
    })());
    return;
  }

  // Cache-first for app assets
  if (isSameOrigin && (url.pathname.endsWith(".png") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".html"))) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.status === 200) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })());
    return;
  }

  // TMDB API + TMDB images: stale-while-revalidate
  if (url.hostname.includes("themoviedb.org") || url.hostname.includes("tmdb.org")) {
    event.respondWith(staleWhileRevalidate(req, VERSION + "-tmdb"));
    return;
  }

  // Default: let the request pass through
});
