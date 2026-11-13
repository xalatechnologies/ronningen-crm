/* Event Manager service worker. Deliberately tiny and privacy-first (docs/pwa-install-plan.md section 6):
 * it caches ONLY the static offline page and one icon, and answers ONLY navigations that fail because the
 * network is down. Nothing from /app, /portal, /i, /auth, /admin or /api is ever stored or served from here.
 * Bump CACHE when this file or offline.html changes. */
const CACHE = "em-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only page navigations; every other request (data, scripts, images, API) goes straight to the network.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
