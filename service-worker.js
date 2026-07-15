/* Service worker de Beeziday — met en cache la coquille de l'app pour un usage hors-ligne.
   IMPORTANT : change CACHE_NAME (ex: "beeziday-v2") à chaque fois que tu modifies index.html
   de façon significative, sinon les téléphones continueront d'utiliser l'ancienne version en cache. */
const CACHE_NAME = "beeziday-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Stratégie "cache d'abord, réseau en secours" : rapide et fonctionne hors-ligne,
   tout en mettant discrètement le cache à jour dès qu'une connexion est disponible.
   Exception : version.json part toujours en réseau d'abord, sinon la détection de
   nouvelle version ne verrait jamais que l'ancienne copie mise en cache. */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.url.endsWith("version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
