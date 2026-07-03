// Simple offline cache: stale-while-revalidate for same-origin GETs, so visited
// pages and assets keep working with no signal. Cross-origin (photos, map tiles,
// weather APIs) is left to the network.
//
// Bump CACHE on every release: a new version takes over immediately, and the
// activate handler below deletes any older cache. Without this, a returning
// visitor would keep rendering the previously-cached HTML/JS bundle (with its
// old behaviour) until they hard-refresh — the SW would otherwise amplify the
// stale-cache risk the QA doc warns about.
const CACHE = "ss-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Drop caches from previous releases so they can't grow unbounded or
      // shadow the current bundle.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  )
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
