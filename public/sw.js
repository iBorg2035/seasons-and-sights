// Simple offline cache: stale-while-revalidate for same-origin GETs, so visited
// pages and assets keep working with no signal. Cross-origin (photos, map tiles,
// weather APIs) is left to the network.
const CACHE = "ss-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
