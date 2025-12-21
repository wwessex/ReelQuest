/* CineSafari service worker (network-first for navigation)
   Keeps the app loading after updates, and caches TMDB + images opportunistically.
*/
const VERSION = "cs-sw-v14-modules";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./ui.js",
  "./storage.js",
  "./supabase.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
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

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.status === 200) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && (res.status === 200 || res.type === "opaque")) cache.put(request, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || cached;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation: network-first, then cache, then fallback to cached index
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        if (fresh && fresh.status === 200) {
          // Keep the exact navigation response cached too
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        }
      } catch (e) {}
      const cache = await caches.open(VERSION);
      const cachedNav = await cache.match(req);
      if (cachedNav) return cachedNav;
      const cachedIndex = await cache.match("./index.html");
      if (cachedIndex) return cachedIndex;
      return fetch(req);
    })());
    return;
  }

  // App assets: cache-first
  if (sameOrigin && (url.pathname.endsWith(".png") || url.pathname.endsWith(".webmanifest") || url.pathname.endsWith(".js"))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // TMDB + images: stale-while-revalidate
  if (url.hostname.includes("themoviedb.org") || url.hostname.includes("tmdb.org")) {
    event.respondWith(staleWhileRevalidate(req, VERSION + "-tmdb"));
    return;
  }
});
