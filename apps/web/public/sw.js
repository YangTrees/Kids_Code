/* global self, caches, fetch, URL */

const CACHE_VERSION = "kids-code-shell-v3";
const CORE_ASSETS = [
  "%BASE_URL%",
  "%BASE_URL%manifest.webmanifest",
  "%BASE_URL%assets/backgrounds/forest-960x720.webp",
  "%BASE_URL%assets/characters/liji/liji-idle.png",
  "%BASE_URL%assets/objects/star-coin.png",
  "%BASE_URL%assets/objects/treasure-chest.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("kids-code-") && key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const shell = CORE_ASSETS[0];
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(shell, copy));
          return response;
        })
        .catch(() => caches.match(shell)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
