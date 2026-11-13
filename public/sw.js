// Service worker: guarda el juego en el teléfono para que se abra rápido y funcione sin internet.
// Primero intenta la red (para recibir las actualizaciones) y, si no hay conexión, usa lo guardado.
const CACHE = "cohete-del-granero-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icono-192.png", "./icono-512.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.endsWith(".mp4")) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))),
  );
});
