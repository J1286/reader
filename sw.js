const CACHE_NAME = "my-reader-v3";

const APP_SHELL = [
  "/reader/",
  "/reader/index.html",
  "/reader/style.css",
  "/reader/app.js",
  "/reader/state.js",
  "/reader/library.js",
  "/reader/reader.js",
  "/reader/formatter.js",
  "/reader/chapters.js",
  "/reader/cleanup.js",
  "/reader/import.js",
  "/reader/export.js",
  "/reader/backup.js",
  "/reader/manifest.json",
  "/reader/icon-001.png",
  "/reader/icon-001.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      });
    })
  );
});