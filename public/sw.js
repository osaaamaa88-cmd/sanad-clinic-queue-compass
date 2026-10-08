/* SANAD offline service worker: pages network-first, static assets cache-first. */
const CACHE = "sanad-v2";
const TILES = "sanad-tiles-v1";
const MAX_TILES = 1500;
const SHELL = ["/", "/patient", "/patient/emergency", "/patient/meds", "/patient/assistant"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (url.hostname === "tile.openstreetmap.org") {
    // Map tiles: cache-first so viewed areas open instantly and work offline.
    e.respondWith(
      caches.open(TILES).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok || res.type === "opaque") {
                c.put(req, res.clone());
                c.keys().then((ks) => { if (ks.length > MAX_TILES) ks.slice(0, ks.length - MAX_TILES).forEach((k) => c.delete(k)); });
              }
              return res;
            }).catch(() => hit || new Response("", { status: 504 })),
        ),
      ),
    );
    return;
  }
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // backend, maps, youtube: always live
  if (sameOrigin && url.pathname.startsWith("/_serverFn")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/patient") || caches.match("/"))),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
