/* =================================================
   MY READER SERVICE WORKER
================================================= */

const CACHE_NAME = "my-reader-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",

  "./state.js",
  "./cleanup.js",
  "./chapters.js",
  "./formatter.js",
  "./reader.js",
  "./import.js",
  "./library.js",
  "./export.js",
  "./app.js",

  "./manifest.json"
];


/* =================================================
   INSTALL
================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});


/* =================================================
   ACTIVATE
================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});


/* =================================================
   FETCH
================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (
              !response ||
              response.status !== 200 ||
              response.type === "opaque"
            ) {
              return response;
            }

            const responseClone =
              response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(
                  request,
                  responseClone
                );
              });

            return response;
          })
          .catch(() => {
            return caches.match(
              "./index.html"
            );
          });
      })
  );
});