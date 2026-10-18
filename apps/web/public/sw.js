/* global self, caches, fetch, URL */

const CACHE_VERSION = "kids-code-shell-v7-brand";
const CORE_ASSETS = [
  "%BASE_URL%",
  "%BASE_URL%manifest.webmanifest",
  "%BASE_URL%assets/backgrounds/forest-960x720.webp",
  "%BASE_URL%assets/characters/liji/liji-idle.png",
  "%BASE_URL%assets/objects/star-coin.png",
  "%BASE_URL%assets/objects/treasure-chest.png",
  "%BASE_URL%assets/characters/story-ip/tuantuan-stage-front-v1.webp",
  "%BASE_URL%assets/characters/story-ip/tuantuan-stage-right-v1.webp",
  "%BASE_URL%assets/objects/story-ip/treasure-chest-v1.webp",
  "%BASE_URL%assets/objects/story-ip/star-coin-v1.webp",
  "%BASE_URL%assets/backgrounds/story-ip/garden-v1.webp",
  "%BASE_URL%assets/backgrounds/story-ip/cloud-island-v1.webp",
  "%BASE_URL%assets/backgrounds/story-ip/data-workshop-v1.webp",
  "%BASE_URL%assets/ui/story-ip/diandian-hint-v2.webp",
  "%BASE_URL%assets/ui/story-ip/tuantuan-curious-v1.webp",
  "%BASE_URL%assets/ui/story-ip/tuantuan-happy-v1.webp",
  "%BASE_URL%assets/ui/story-ip/tuantuan-pointing-v1.webp",
  "%BASE_URL%assets/ui/story-ip/diandian-default-v1.webp",
  "%BASE_URL%assets/ui/story-ip/home-hero-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-basics-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-interaction-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-thinking-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-creation-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-route-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-sky-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-data-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-patterns-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-decisions-v1.webp",
  "%BASE_URL%assets/ui/story-ip/unit-makers-v1.webp",
  "%BASE_URL%assets/sounds/ui-click.wav",
  "%BASE_URL%assets/sounds/collect-coin.wav",
  "%BASE_URL%assets/sounds/game-success.wav",
  "%BASE_URL%assets/sounds/jump.wav",
  "%BASE_URL%assets/sounds/bump.wav",
  "%BASE_URL%assets/sounds/door-open.wav",
  "%BASE_URL%assets/sounds/magic.wav",
  "%BASE_URL%assets/sounds/pop.wav",
  "%BASE_URL%assets/sounds/whoosh.wav",
  "%BASE_URL%assets/sounds/bell.wav",
  "%BASE_URL%assets/sounds/drum.wav",
  "%BASE_URL%assets/sounds/splash.wav",
  "%BASE_URL%assets/sounds/sparkle.wav",
  "%BASE_URL%assets/sounds/countdown.wav",
  "%BASE_URL%assets/sounds/game-over.wav",
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
