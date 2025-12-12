/* ReelQuest service worker (v2)
   - Network-first for navigation (so you don’t get stuck on an old/broken build)
   - Cache app assets + TMDB requests
*/
const VERSION = "rq-sw-v2";
const ASSET_CACHE = VERSION + "-assets";
const TMDB_CACHE = VERSION + "-tmdb";

const APP_ASSETS = [
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(ASSET_CACHE);
    await cache.addAll(APP_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k.startsWith("rq-sw-") && k !== ASSET_CACHE && k !== TMDB_CACHE) ? caches.delete(k) : Promise.resolve()));

    // Prime a cached index.html for offline fallback (but do not block activation on failure)
    try {
      const cache = await caches.open(ASSET_CACHE);
      const res = await fetch("./index.html", { cache: "no-store" });
      if (res && res.status === 200) {
        cache.put("./index.html", res.clone()).catch(() => {});
      }
    } catch (e) {}

    self.clients.claim();
  })());
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
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
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation: NETWORK-FIRST, fallback to cached index.html
  if (isSameOrigin && req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put("./index.html", fresh.clone()).catch(() => {});
          return fresh;
        }
      } catch (e) {}

      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match("./index.html");
      if (cached) return cached;
      return fetch(req);
    })());
    return;
  }

  // Same-origin assets: cache-first
  if (isSameOrigin && (url.pathname.endsWith(".png") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".html"))) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
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

  // TMDB API + images: stale-while-revalidate
  if (url.hostname.includes("themoviedb.org") || url.hostname.includes("tmdb.org")) {
    event.respondWith(staleWhileRevalidate(req, TMDB_CACHE));
    return;
  }
});
