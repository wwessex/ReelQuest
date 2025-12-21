/* CineSafari Service Worker (RECOVERY MODE)
   - Clears old caches on activation
   - Network-only fetch (avoids serving stale/broken cached app)
*/
const VERSION = "cs-sw-recover-1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    try { await self.clients.claim(); } catch (e) {}
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!req || req.method !== "GET") return;

  event.respondWith((async () => {
    try {
      // Always prefer the network to avoid stale cached HTML/JS.
      return await fetch(req);
    } catch (e) {
      // Minimal offline fallback: try cache, else plain text.
      try {
        const cache = await caches.open("cinesafari-offline-" + VERSION);
        const hit = await cache.match(req);
        if (hit) return hit;
      } catch (e2) {}
      return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
