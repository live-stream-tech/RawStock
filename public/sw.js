// __CACHE_VERSION__ is replaced at build time to rotate caches per deploy.
const CACHE_NAME = "rawstock-__CACHE_VERSION__";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const toDelete = keys.filter((k) => k.startsWith("rawstock-") && k !== CACHE_NAME);
      return Promise.all(toDelete.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  const reqUrl = new URL(event.request.url);
  const isRuntimeCodeAsset =
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "worker" ||
    reqUrl.pathname.includes("/_expo/") ||
    reqUrl.pathname.endsWith(".js") ||
    reqUrl.pathname.endsWith(".css");

  // Navigation requests (HTML): network-first to fetch latest pages.
  const isNav = event.request.mode === "navigate";
  if (isNav || isRuntimeCodeAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("/")))
    );
    return;
  }

  // All other requests: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match("/"));
    })
  );
});
