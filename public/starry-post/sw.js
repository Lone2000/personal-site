const CACHE = "starry-post-v1";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/sky.js",
  "/stickers.js",
  "/sound.js",
  "/icon.svg",
  "/manifest.webmanifest"
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())
    // a failed precache must not block install
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {
        });
      }
      return res;
    }).catch(
      () => caches.match(req).then(
        (hit) => hit || caches.match("/index.html") || new Response("offline", { status: 503, headers: { "Content-Type": "text/plain" } })
      )
    )
  );
});
