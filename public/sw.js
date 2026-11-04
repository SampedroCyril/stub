/* Service worker : rend l'app installable et utilisable hors ligne.
 * - pages : réseau d'abord, cache en secours (tu as toujours la dernière version en ligne)
 * - fichiers versionnés (assets/), runtime MediaPipe et modèles : cache d'abord
 */
const CACHE = "anticlope-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const cacheFirst = async (req) => {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
};

const networkFirst = async (req) => {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) || (await caches.match("./index.html"));
  }
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") return e.respondWith(networkFirst(req));
  const sameOrigin = url.origin === self.location.origin;
  const heavy = /\/(assets|mediapipe|models)\//.test(url.pathname) || url.hostname === "storage.googleapis.com";
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if ((sameOrigin && heavy) || url.hostname === "storage.googleapis.com" || fonts) return e.respondWith(cacheFirst(req));
  if (sameOrigin) return e.respondWith(networkFirst(req));
});
