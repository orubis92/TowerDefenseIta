/* Service worker: cache-first per giocare offline */
const CACHE = "trattoria-defense-v6";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/style.css",
  "./js/config.js", "./js/sprites.js", "./js/audio.js", "./js/entities.js", "./js/game.js", "./js/render.js", "./js/ui.js", "./js/main.js",
  "./icons/icon-192.png", "./icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // pagina principale: prima la rete (così gli aggiornamenti arrivano), cache come riserva offline
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
