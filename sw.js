const CACHE_NAME = "my-reader-v10.3.4";

const APP_SHELL = [
  "/reader/",
  "/reader/index.html",
  "/reader/style.css",
  "/reader/chapters.js",
  "/reader/reader.js",
  "/reader/app.js",
  "/reader/state.js",
  "/reader/library.js",
  "/reader/formatter.js",
  "/reader/cleanup.js",
  "/reader/import.js",
  "/reader/export.js",
  "/reader/backup.js",
  "/reader/manifest.json",
  "/reader/assets/bookshelf-bg.png",
  "/reader/assets/default-book-cover.png"
];

/* INSTALL */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
});

/* MESSAGE */

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ACTIVATE */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

/* FETCH */

self.addEventListener("fetch", handleFetch);

function handleFetch(event) {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(getCachedResponse(request));
}

async function getCachedResponse(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (
    networkResponse &&
    networkResponse.status === 200 &&
    networkResponse.type === "basic"
  ) {
    const responseToCache = networkResponse.clone();

    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, responseToCache);
  }

  return networkResponse;
}
