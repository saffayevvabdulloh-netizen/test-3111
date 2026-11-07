// Bolajon AI service worker: lets the app be installed and open without network after a first visit.
// * API / admin / media are NEVER cached (always live data, no stale logins).
// * Built files in /assets/ have hashed names -> cache-first.
// * Pages: network first, fall back to the last copy when offline.
const V = "bolajon-v2";
const SHELL = ["/", "/favicon.svg", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const keep = (req, res) => { if (res && res.ok && res.type === "basic") { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (/^\/(api|admin|media)(\/|$)/.test(url.pathname)) return;
  if (req.mode === "navigate") {
    // network first, but on a weak connection do not make the child stare at a blank screen: after 3.5 s show the saved copy
    const saved = () => caches.match(req).then((r) => r || caches.match("/"));
    const net = fetch(req).then((r) => keep(req, r));
    e.respondWith(Promise.race([net, new Promise((res) => setTimeout(() => saved().then((r) => r && res(r)), 3500))]).catch(saved));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => keep(req, r))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => { const net = fetch(req).then((r) => keep(req, r)).catch(() => hit); return hit || net; }));
});
