/* Service worker de Beeziday — met en cache les fichiers de l'app pour un usage hors-ligne.

   IMPORTANT — à chaque mise à jour publiée sur GitHub, mets exactement LA MÊME chaîne de version
   dans CES TROIS ENDROITS (ex: "1.2.0") :
     1. CACHE_NAME ci-dessous → "beeziday-1.2.0"
     2. version.json → {"version": "1.2.0"}
     3. APP_VERSION dans index.html (tout en haut du <script>)
   Les trois doivent toujours être identiques, mot pour mot. C'est ce qui permet à l'app de
   détecter qu'une nouvelle version existe et de rafraîchir son cache. */
const CACHE_NAME = "beeziday-2.1.0";
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

/* La coquille de l'app (index.html, "./") et version.json partent TOUJOURS en réseau d'abord :
   sinon, une fois une version installée, le téléphone continuerait indéfiniment à charger
   l'ancienne copie mise en cache même après une mise à jour publiée — c'est ce qui causait
   le message "nouvelle version disponible" qui ne disparaissait jamais.
   Tout le reste (icônes, manifest) reste en cache d'abord pour rester rapide et fonctionner
   hors-ligne, avec une mise à jour discrète du cache dès qu'une connexion est là. */
const NETWORK_FIRST = ["version.json", "index.html"];

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isNetworkFirst =
    NETWORK_FIRST.some((name) => event.request.url.endsWith(name)) ||
    event.request.mode === "navigate";

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
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
