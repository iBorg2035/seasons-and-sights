// Simple offline cache so visited pages and assets keep working with no signal.
// Cross-origin (photos, map tiles, weather APIs) is left to the network.
//
// The cache name comes from the `?v=` on the registration URL, which
// ServiceWorkerRegister stamps with the build id. It used to be a constant that
// every release was supposed to bump by hand; three releases went out without
// it, and then a fourth, which is the point at which "remember to bump it" stops
// being a workable design. A returning visitor kept rendering the previously
// cached bundle — old behaviour, no error, nothing to see — until they hard
// refreshed. Deriving it from the build makes the bump automatic: a new
// deployment is a new URL, so it is a new service worker with an empty cache.
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `ss-${VERSION}`;

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

  // Documents go to the network first, falling back to cache only when the
  // request actually fails. Belt and braces alongside the versioned cache
  // above: even if a stale worker somehow survives, it can no longer serve a
  // stale page to someone who has signal. Hashed assets keep the fast path —
  // their filenames change when their contents do, so a hit is never stale.
  const documentFirst = req.mode === "navigate";

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
      if (documentFirst) return (await network) || cached;
      return cached || network;
    })()
  );
});
